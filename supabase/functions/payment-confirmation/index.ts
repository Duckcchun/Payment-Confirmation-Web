import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";

const app = new Hono();
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
const ALLOWED_AMOUNTS = new Set([30000, 40000]);
const STUDENT_ID_REGEX = /^\d{8}$/;

function getInvalidRequest(message: string) {
  return { error: message };
}

function requireAdminAuth(c: any) {
  if (!ADMIN_PASSWORD) {
    return c.json({ error: "Admin password is not configured" }, 500);
  }

  const password = c.req.header("x-admin-password") || "";
  if (password !== ADMIN_PASSWORD) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return null;
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "x-admin-password",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// 이메일 전송 함수
async function sendEmailNotification(submission: any) {
  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'qasw1733@gmail.com';

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not set');
      return;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'DKU 멋쟁이사자처럼 <onboarding@resend.dev>',
        to: [adminEmail],
        subject: `🦁 [새 입금 요청] ${submission.name} (${submission.amount.toLocaleString()}원)`,
        html: `
          <div style="font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🦁 단국대학교 멋쟁이사자처럼</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">새로운 입금 확인 요청</p>
            </div>

            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; margin-bottom: 20px;">
              <h2 style="color: #1A1A1A; margin-top: 0; font-size: 20px;">입금 요청 정보</h2>
              
              <div style="margin: 15px 0;">
                <div style="display: inline-block; background-color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 10px; width: 100%; box-sizing: border-box;">
                  <strong style="color: #666; font-size: 14px;">이름</strong>
                  <p style="margin: 5px 0 0 0; font-size: 18px; color: #1A1A1A;"><strong>${submission.name}</strong></p>
                </div>
                
                <div style="display: inline-block; background-color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 10px; width: 100%; box-sizing: border-box;">
                  <strong style="color: #666; font-size: 14px;">학번</strong>
                  <p style="margin: 5px 0 0 0; font-size: 18px; color: #1A1A1A;">${submission.studentId}</p>
                </div>
                
                <div style="display: inline-block; background-color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 10px; width: 100%; box-sizing: border-box;">
                  <strong style="color: #666; font-size: 14px;">금액</strong>
                  <p style="margin: 5px 0 0 0; font-size: 24px; color: #FF6B00;"><strong>${submission.amount.toLocaleString()}원</strong></p>
                </div>
                
                <div style="display: inline-block; background-color: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 10px; width: 100%; box-sizing: border-box;">
                  <strong style="color: #666; font-size: 14px;">제출 시간</strong>
                  <p style="margin: 5px 0 0 0; font-size: 16px; color: #1A1A1A;">${new Date(submission.timestamp).toLocaleString('ko-KR')}</p>
                </div>
              </div>
            </div>

            <div style="background-color: #FFF3E0; padding: 20px; border-radius: 12px; border-left: 4px solid #FF6B00; margin-bottom: 20px;">
              <p style="margin: 0; color: #1A1A1A; font-size: 14px;">
                <strong>💡 다음 단계:</strong><br>
                1. 입금 내역 확인<br>
                2. 운영진 대시보드에서 입금 완료 처리
              </p>
            </div>

            <div style="text-align: center; padding: 20px 0;">
              <a href="${Deno.env.get('SITE_URL') || 'https://example.com'}/admin" 
                 style="display: inline-block; background-color: #FF6B00; color: white; text-decoration: none; padding: 15px 40px; border-radius: 10px; font-weight: bold; font-size: 16px;">
                운영진 대시보드 바로가기
              </a>
            </div>

            <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0; margin-top: 30px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                단국대학교 멋쟁이사자처럼 14기 | qasw1733@gmail.com | 010-6286-1733
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Failed to send email:', errorData);
    } else {
      console.log('Email notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

// Health check endpoint
app.get("/payment-confirmation/health", (c) => {
  return c.json({ status: "ok" });
});

// 관리자 인증 확인
app.post("/payment-confirmation/admin-auth", (c) => {
  const authError = requireAdminAuth(c);
  if (authError) return authError;
  return c.json({ success: true });
});

// 입금 확인 요청 제출
app.post("/payment-confirmation/submissions", async (c) => {
  try {
    const body = await c.req.json();
    const { name, studentId, amount } = body;
    const parsedAmount = Number(amount);

    if (!name || !studentId || amount === undefined || amount === null) {
      return c.json(getInvalidRequest("Missing required fields"), 400);
    }

    if (!STUDENT_ID_REGEX.test(String(studentId))) {
      return c.json(getInvalidRequest("학번은 8자리 숫자여야 합니다"), 400);
    }

    if (!ALLOWED_AMOUNTS.has(parsedAmount)) {
      return c.json(getInvalidRequest("허용되지 않은 금액입니다"), 400);
    }

    // 학번 중복 확인
    const existingKey = `submission:${studentId}`;
    const existing = await kv.get(existingKey);
    
    if (existing) {
      return c.json({ error: "이미 등록된 학번입니다" }, 400);
    }

    // 제출 데이터 저장
    const submission = {
      id: crypto.randomUUID(),
      name: name.trim(),
      studentId,
      amount: parsedAmount,
      status: 'pending',
      timestamp: Date.now(),
    };

    await kv.set(existingKey, submission);
    
    console.log('Submission created:', submission);
    await sendEmailNotification(submission);
    return c.json({ success: true, submission });
  } catch (error) {
    console.error('Error creating submission:', error);
    return c.json({ error: "Failed to create submission" }, 500);
  }
});

// 학번으로 상태 조회
app.get("/payment-confirmation/submissions/:studentId", async (c) => {
  try {
    const studentId = c.req.param("studentId");
    const key = `submission:${studentId}`;
    const submission = await kv.get(key);

    if (!submission) {
      return c.json({ error: "등록된 정보가 없습니다" }, 404);
    }

    return c.json({ submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return c.json({ error: "Failed to fetch submission" }, 500);
  }
});

// 전체 제출 내역 조회 (운영진용)
app.get("/payment-confirmation/submissions", async (c) => {
  const authError = requireAdminAuth(c);
  if (authError) return authError;

  try {
    const submissions = await kv.getByPrefix("submission:");
    return c.json({ submissions });
  } catch (error) {
    console.error('Error fetching all submissions:', error);
    return c.json({ error: "Failed to fetch submissions" }, 500);
  }
});

// 상태 업데이트 (운영진용)
app.put("/payment-confirmation/submissions/:studentId", async (c) => {
  const authError = requireAdminAuth(c);
  if (authError) return authError;

  try {
    const studentId = c.req.param("studentId");
    const body = await c.req.json();
    const { status } = body;

    if (!status || !["pending", "confirmed"].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    const key = `submission:${studentId}`;
    const submission = await kv.get(key);

    if (!submission) {
      return c.json({ error: "Submission not found" }, 404);
    }

    const updatedSubmission = { ...submission, status };
    await kv.set(key, updatedSubmission);

    console.log('Submission updated:', updatedSubmission);
    return c.json({ success: true, submission: updatedSubmission });
  } catch (error) {
    console.error('Error updating submission:', error);
    return c.json({ error: "Failed to update submission" }, 500);
  }
});

// CSV 자동 매칭
app.post("/payment-confirmation/match-csv", async (c) => {
  const authError = requireAdminAuth(c);
  if (authError) return authError;

  try {
    const body = await c.req.json();
    const { entries } = body; // [{ name, amount }, ...]

    if (!Array.isArray(entries)) {
      return c.json({ error: "Invalid entries format" }, 400);
    }

    let matchedCount = 0;
    const submissions = await kv.getByPrefix("submission:");

    for (const entry of entries) {
      const { name, amount } = entry;
      const parsedAmount = Number(amount);

      if (!name || !Number.isFinite(parsedAmount)) {
        continue;
      }
      
      // 이름과 금액이 일치하고 대기중인 제출 찾기
      const match = submissions.find(
        (s: any) => s.name === name && s.amount === parsedAmount && s.status === 'pending'
      );

      if (match) {
        const key = `submission:${match.studentId}`;
        await kv.set(key, { ...match, status: 'confirmed' });
        matchedCount++;
      }
    }

    console.log(`CSV matching completed: ${matchedCount} matched`);
    return c.json({ success: true, matchedCount });
  } catch (error) {
    console.error('Error matching CSV:', error);
    return c.json({ error: "Failed to match CSV" }, 500);
  }
});

// 전체 데이터 삭제 (운영진용)
app.delete("/payment-confirmation/submissions", async (c) => {
  const authError = requireAdminAuth(c);
  if (authError) return authError;

  try {
    const submissions = await kv.getByPrefix("submission:");
    
    for (const submission of submissions) {
      await kv.del(`submission:${submission.studentId}`);
    }

    console.log('All submissions deleted');
    return c.json({ success: true, deletedCount: submissions.length });
  } catch (error) {
    console.error('Error deleting submissions:', error);
    return c.json({ error: "Failed to delete submissions" }, 500);
  }
});

Deno.serve(app.fetch);