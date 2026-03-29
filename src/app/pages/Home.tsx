import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "../components/ui/radio-group";
import { Card } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import logo from "../../assets/dku-likelion-logo.png";
import kakaoPayLogo from "../../assets/kakaopay-logo.png";
import tossLogo from "../../assets/toss-logo.png";
import {
  api,
  adminSession,
  type PaymentSubmission,
} from "../lib/api";
import { useNavigate } from "react-router";

type Step = "form" | "loading" | "complete";

// 계좌 정보 상수
const ACCOUNT_INFO = {
  bank: "토스뱅크",
  accountNumber: "1002-4993-3619",
  accountHolder: "단국대 멋사대학",
};

export default function Home() {
  const [step, setStep] = useState<Step>("form");
  const [selectedAmount, setSelectedAmount] =
    useState<number>(30000);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [searchStudentId, setSearchStudentId] = useState("");
  const [searchResult, setSearchResult] =
    useState<PaymentSubmission | null>(null);

  // 바텀 시트 상태
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [paymentMethodSelected, setPaymentMethodSelected] =
    useState(false);
  const [isTossLogoError, setIsTossLogoError] = useState(false);

  // Admin 접근 관련 상태
  const [shiftCount, setShiftCount] = useState(0);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const navigate = useNavigate();

  // Shift 키 5번 연속 감지
  useEffect(() => {
    let resetTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setShiftCount((prev) => {
          const newCount = prev + 1;

          if (newCount === 5) {
            setShowAdminDialog(true);
            return 0;
          }

          return newCount;
        });

        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          setShiftCount(0);
        }, 2000);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(resetTimer);
    };
  }, []);

  // 관리자 로그인 처리
  const handleAdminLogin = async () => {
    const password = adminPassword.trim();
    if (!password) {
      toast.error("비밀번호를 입력해주세요");
      return;
    }

    try {
      await api.verifyAdminPassword(password);
      adminSession.setPassword(password);
      toast.success("관리자 인증 성공", {
        description: "운영진 대시보드로 이동합니다",
      });
      setShowAdminDialog(false);
      setAdminPassword("");
      navigate("/admin");
    } catch {
      toast.error("비밀번호가 올바르지 않습니다");
      setAdminPassword("");
    }
  };

  // 메인 버튼 클릭 (송금하기 또는 확인 요청하기)
  const handleMainButtonClick = () => {
    if (!name.trim() || studentId.length !== 8) {
      toast.error("입력 정보를 확인해주세요", {
        description:
          "이름과 8자리 학번을 올바르게 입력해주세요",
      });
      return;
    }

    if (!paymentMethodSelected) {
      // 아직 송금 방법을 선택하지 않았으면 바텀 시트 열기
      setShowBottomSheet(true);
    } else {
      // 송금 방법을 선택했으면 제출
      handleSubmit();
    }
  };

  // 계좌번호 복사
  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(
        ACCOUNT_INFO.accountNumber,
      );
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyAccount = async () => {
    const copied = await copyAccountNumber();

    if (copied) {
      toast.success("계좌번호가 복사되었습니다! 📋", {
        description: `${ACCOUNT_INFO.bank}에서 ${selectedAmount.toLocaleString()}원을 송금해 주세요`,
        duration: 5000,
      });

      setShowBottomSheet(false);
      setPaymentMethodSelected(true);
    } else {
      toast.error("복사 실패", {
        description: "계좌번호: " + ACCOUNT_INFO.accountNumber,
      });
    }
  };

  // 토스로 열기
  const handleOpenToss = () => {
    const tossLink = `supertoss://send?bank=${encodeURIComponent(ACCOUNT_INFO.bank)}&accountNo=${encodeURIComponent(ACCOUNT_INFO.accountNumber)}&amount=${encodeURIComponent(String(selectedAmount))}&msg=${encodeURIComponent("멋쟁이사자처럼14기")}`;
    window.open(tossLink, "_blank");

    toast.success("토스 앱으로 이동합니다", {
      description: `송금 후 확인 요청 버튼을 눌러주세요`,
    });

    setShowBottomSheet(false);
    setPaymentMethodSelected(true);
  };

  const isMobileDevice = () =>
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const isAndroidDevice = () => /Android/i.test(navigator.userAgent);

  // 카카오페이로 열기
  const handleOpenKakaoPay = async () => {
    const payHomeLink = "kakaotalk://kakaopay/main";

    const copied = await copyAccountNumber();
    if (copied) {
      toast.success("계좌를 복사했어요", {
        description:
          "카카오페이에서 붙여넣기 후 송금해 주세요.",
      });
    } else {
      toast.error("계좌 복사에 실패했어요", {
        description:
          "카카오페이 홈으로 이동 후 계좌번호를 직접 입력해 주세요.",
      });
    }

    if (!isMobileDevice()) {
      toast.error("모바일에서 카카오페이를 열 수 있어요", {
        description:
          "계좌는 복사되었어요. 모바일 카카오페이에서 붙여넣기 후 송금해 주세요.",
      });
      return;
    }

    setShowBottomSheet(false);
    setPaymentMethodSelected(true);

    // 카카오페이 홈 열기
    if (isAndroidDevice()) {
      const androidIntent =
        "intent://kakaopay/main#Intent;scheme=kakaotalk;package=com.kakao.talk;end";
      window.location.href = androidIntent;
    } else {
      window.location.href = payHomeLink;
    }

    // 홈 실행도 실패하면 사용자에게 다음 동작을 명확히 안내
    setTimeout(() => {
      if (document.visibilityState === "visible") {
        toast.error("카카오페이 홈 실행에 실패했어요", {
          description:
            "계좌는 복사되어 있어요. 카카오톡 앱을 직접 열어 카카오페이로 송금해 주세요.",
        });
      }
    }, 1400);
  };

  // 제출 처리
  const handleSubmit = async () => {
    if (
      !name.trim() ||
      !studentId ||
      studentId.length !== 8 ||
      !selectedAmount
    ) {
      toast.error("입력 정보를 확인해주세요", {
        description:
          "이름과 8자리 학번을 올바르게 입력해주세요",
      });
      return;
    }

    setStep("loading");

    try {
      console.log("Submitting:", {
        name: name.trim(),
        studentId,
        amount: selectedAmount,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));
      await api.createSubmission({
        name: name.trim(),
        studentId,
        amount: selectedAmount,
      });

      setStep("complete");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      toast.success("입금 확인 요청이 완료되었습니다!", {
        description: "운영진이 확인 중입니다",
      });
    } catch (error: any) {
      console.error("Failed to submit:", error);
      setStep("form");

      toast.error("제출 실패", {
        description: error.message || "다시 시도해주세요",
      });
    }
  };

  // 상태 조회
  const handleStatusCheck = async () => {
    if (searchStudentId.length !== 8) {
      toast.error("8자리 학번을 입력해주세요");
      return;
    }

    try {
      const response = await api.getSubmission(searchStudentId);
      setSearchResult(response.submission);
    } catch (error: any) {
      setSearchResult(null);
      toast.error("등록된 정보가 없습니다", {
        description: "먼저 송금 후 확인 요청을 해주세요",
      });
    }
  };

  const handleReset = () => {
    setStep("form");
    setName("");
    setStudentId("");
    setSearchStudentId("");
    setSearchResult(null);
    setPaymentMethodSelected(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-green-50/30"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-orange-200/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-green-200/20 rounded-full blur-3xl"></div>

      <div className="relative max-w-md mx-auto px-4 py-6 md:py-12">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* 헤더 */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
              >
                <div className="flex justify-center">
                  <motion.img
                    src={logo}
                    alt="단국대학교 멋쟁이사자처럼 로고"
                    className="w-24 h-24 md:w-28 md:h-28 object-contain"
                    whileHover={{ scale: 1.05 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    단국대학교 멋쟁이사자처럼
                  </h1>
                  <p className="text-base text-gray-600">
                    14기 회비 납부
                  </p>
                </div>
              </motion.div>

              {/* 메인 카드 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-5 md:p-8 shadow-xl md:shadow-2xl border-0 backdrop-blur-xl bg-white/90">
                  <div className="space-y-6">
                    {/* 정보 입력 */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label
                          htmlFor="name"
                          className="text-sm font-semibold"
                        >
                          이름
                        </Label>
                        <Input
                          id="name"
                          placeholder="홍길동"
                          value={name}
                          onChange={(e) =>
                            setName(e.target.value)
                          }
                          className="h-12 text-base border-2 focus:border-[var(--lion-orange)] transition-all"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="studentId"
                          className="text-sm font-semibold"
                        >
                          학번
                        </Label>
                        <Input
                          id="studentId"
                          placeholder="20241234"
                          value={studentId}
                          onChange={(e) => {
                            const value = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 8);
                            setStudentId(value);
                          }}
                          maxLength={8}
                          className="h-12 text-base border-2 focus:border-[var(--lion-orange)] transition-all"
                          required
                        />
                        <p className="text-xs text-gray-500">
                          8자리 학번을 입력해주세요
                        </p>
                      </div>
                    </div>

                    {/* 금액 선택 */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">
                        납부 금액
                      </Label>

                      <RadioGroup
                        value={selectedAmount.toString()}
                        onValueChange={(value) =>
                          setSelectedAmount(Number(value))
                        }
                        className="grid gap-3"
                      >
                        <Label
                          htmlFor="option-1"
                          className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                            selectedAmount === 30000
                              ? "border-[var(--lion-orange)] bg-orange-50 shadow-md"
                              : "border-gray-200 active:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem
                              value="30000"
                              id="option-1"
                              className="w-5 h-5"
                            />
                            <div className="space-y-0.5">
                              <div className="font-semibold text-base">
                                동아리 회비
                              </div>
                              <div className="text-xs text-gray-500">
                                기본 회비
                              </div>
                            </div>
                          </div>
                          <div
                            className="text-xl font-bold"
                            style={{
                              color: "var(--lion-orange)",
                            }}
                          >
                            30,000
                            <span className="text-sm">원</span>
                          </div>
                        </Label>

                        <Label
                          htmlFor="option-2"
                          className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all active:scale-[0.98] ${
                            selectedAmount === 40000
                              ? "border-[var(--lion-orange)] bg-orange-50 shadow-md"
                              : "border-gray-200 active:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <RadioGroupItem
                              value="40000"
                              id="option-2"
                              className="w-5 h-5"
                            />
                            <div className="space-y-0.5">
                              <div className="font-semibold text-base">
                                회비 + OT 뒷풀이
                              </div>
                              <div className="text-xs text-gray-500">
                                회비 + 뒷풀이 비용
                              </div>
                            </div>
                          </div>
                          <div
                            className="text-xl font-bold"
                            style={{
                              color: "var(--lion-orange)",
                            }}
                          >
                            40,000
                            <span className="text-sm">원</span>
                          </div>
                        </Label>
                      </RadioGroup>
                    </div>

                    {/* 메인 CTA 버튼 - 단 하나! */}
                    <Button
                      onClick={handleMainButtonClick}
                      className="w-full h-16 text-lg font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all"
                      style={{
                        backgroundColor: paymentMethodSelected
                          ? "var(--success-green)"
                          : "var(--lion-orange)",
                      }}
                    >
                      {paymentMethodSelected ? (
                        <>
                          <CheckCircle2 className="mr-3 h-5 w-5" />
                          송금 완료 후 확인 요청하기
                        </>
                      ) : (
                        <>
                          {selectedAmount.toLocaleString()}원
                          송금하기
                        </>
                      )}
                    </Button>

                    {paymentMethodSelected && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-center text-gray-600"
                      >
                        송금을 완료하셨다면 위 버튼을 눌러주세요
                      </motion.p>
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* 푸터 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-1.5 text-xs text-gray-500"
              >
                <p className="font-medium">
                  단국대학교 멋쟁이사자처럼 14기
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px]">
                  <span>qasw1733@gmail.com</span>
                  <span>•</span>
                  <span>010-6286-1733</span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center min-h-[70vh] space-y-6"
            >
              <motion.img
                src={logo}
                alt="로고"
                className="w-20 h-20 object-contain"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <Loader2
                className="h-10 w-10 animate-spin"
                style={{ color: "var(--lion-orange)" }}
              />

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">
                  확인 요청 접수 중
                </h2>
                <p className="text-base text-gray-600">
                  잠시만 기다려주세요
                </p>
              </div>

              <div className="flex gap-2">
                <motion.div
                  className="w-2.5 h-2.5 rounded-full bg-orange-400"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: 0,
                  }}
                />
                <motion.div
                  className="w-2.5 h-2.5 rounded-full bg-orange-400"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: 0.2,
                  }}
                />
                <motion.div
                  className="w-2.5 h-2.5 rounded-full bg-orange-400"
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: 0.4,
                  }}
                />
              </div>
            </motion.div>
          )}

          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              {/* 완료 헤더 */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
              >
                <div className="flex justify-center">
                  <motion.img
                    src={logo}
                    alt="단국대학교 멋쟁이사자처럼 로고"
                    className="w-24 h-24 md:w-28 md:h-28 object-contain"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                    단국대학교 멋쟁이사자처럼
                  </h1>
                </div>
              </motion.div>

              {/* 완료 메시지 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card
                  className="p-6 md:p-8 shadow-xl md:shadow-2xl border-0 backdrop-blur-xl text-center space-y-5"
                  style={{
                    borderColor: "var(--success-green)",
                    background:
                      "linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)",
                  }}
                >
                  <motion.div
                    className="flex justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      delay: 0.2,
                    }}
                  >
                    <CheckCircle2
                      className="h-16 w-16 md:h-20 md:w-20"
                      style={{ color: "var(--success-green)" }}
                    />
                  </motion.div>

                  <div className="space-y-3">
                    <h2 className="text-2xl md:text-3xl font-bold">
                      제출 완료!
                    </h2>
                    <div className="space-y-2">
                      <p className="text-base text-gray-700 leading-relaxed">
                        <span className="font-semibold">
                          {name}
                        </span>
                        님의 입금 확인 요청이
                        <br className="md:hidden" />{" "}
                        완료되었어요
                      </p>
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/70 backdrop-blur-sm">
                        <span className="text-sm text-gray-600">
                          금액
                        </span>
                        <span
                          className="text-xl font-bold"
                          style={{
                            color: "var(--lion-orange)",
                          }}
                        >
                          {selectedAmount.toLocaleString()}원
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 space-y-1.5 border-t border-green-200">
                    <p className="text-sm text-gray-700 font-medium">
                      운영진이 확인 중입니다
                    </p>
                    <p className="text-xs text-gray-600">
                      입금 확인까지 최대 1~2시간 소요돼요
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* 상태 조회 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-5 md:p-6 shadow-lg md:shadow-xl border-0 backdrop-blur-xl bg-white/90 space-y-3">
                  <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
                    <Search className="h-4 w-4" />내 입금 상태
                    확인
                  </h3>

                  <div className="flex gap-2">
                    <Input
                      placeholder="학번 8자리"
                      value={searchStudentId}
                      onChange={(e) => {
                        const value = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 8);
                        setSearchStudentId(value);
                        if (value.length === 0)
                          setSearchResult(null);
                      }}
                      maxLength={8}
                      className="h-11 text-sm border-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleStatusCheck();
                        }
                      }}
                    />
                    <Button
                      onClick={handleStatusCheck}
                      className="h-11 px-5"
                      style={{
                        backgroundColor: "var(--lion-orange)",
                      }}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  {searchResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl border-2"
                      style={{
                        borderColor:
                          searchResult.status === "confirmed"
                            ? "var(--success-green)"
                            : "#FFA500",
                        backgroundColor:
                          searchResult.status === "confirmed"
                            ? "#E8F5E9"
                            : "#FFF3E0",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        {searchResult.status === "confirmed" ? (
                          <CheckCircle2
                            className="h-6 w-6 flex-shrink-0"
                            style={{
                              color: "var(--success-green)",
                            }}
                          />
                        ) : (
                          <Clock className="h-6 w-6 flex-shrink-0 text-orange-600" />
                        )}
                        <div className="flex-1 space-y-2">
                          <div className="font-bold text-base">
                            {searchResult.status === "confirmed"
                              ? "입금 완료"
                              : "확인 대기 중"}
                          </div>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">
                                이름
                              </span>
                              <span className="font-semibold">
                                {searchResult.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-600">
                                금액
                              </span>
                              <span
                                className="font-semibold"
                                style={{
                                  color: "var(--lion-orange)",
                                }}
                              >
                                {searchResult.amount.toLocaleString()}
                                원
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 pt-0.5">
                            {searchResult.status === "confirmed"
                              ? "입금이 확인되었습니다"
                              : "운영진이 확인 중입니다. 최대 1~2시간 소요됩니다."}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </Card>
              </motion.div>

              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full h-12 text-sm font-semibold rounded-xl border-2 hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                처음으로 돌아가기
              </Button>

              {/* 푸터 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center space-y-1.5 text-xs text-gray-500"
              >
                <p className="font-medium">
                  단국대학교 멋쟁이사자처럼 14기
                </p>
                <div className="flex items-center justify-center gap-2 text-[11px]">
                  <span>qasw1733@gmail.com</span>
                  <span>•</span>
                  <span>010-6286-1733</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 바텀 시트 - 송금 방법 선택 */}
      <AnimatePresence>
        {showBottomSheet && (
          <>
            {/* 어두운 배경 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBottomSheet(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* 바텀 시트 */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 300,
              }}
              className="fixed bottom-0 left-0 right-0 z-50"
            >
              <div className="bg-white rounded-t-3xl shadow-2xl max-w-md mx-auto">
                {/* 헤더 */}
                <div className="relative p-6 pb-4 border-b border-gray-100">
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-gray-300 rounded-full"></div>
                  <button
                    onClick={() => setShowBottomSheet(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                  <h3 className="text-lg md:text-xl font-bold text-center mt-2">
                    어떤 방식으로 송금할까요?
                  </h3>
                  <p className="text-sm text-gray-600 text-center mt-1">
                    {selectedAmount.toLocaleString()}원
                  </p>
                </div>

                {/* 콘텐츠 */}
                <div className="p-6 space-y-4 pb-8">
                  {/* 메인: 계좌번호 복사 */}
                  <Button
                    onClick={handleCopyAccount}
                    className="w-full h-16 text-lg font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all"
                    style={{
                      backgroundColor: "var(--lion-orange)",
                    }}
                  >
                    <Copy className="mr-3 h-5 w-5" />
                    계좌번호 복사하기
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    가장 확실한 방법은 계좌 복사 후 직접 송금입니다.
                  </p>

                  {/* 구분선 */}
                  <div className="relative flex items-center gap-3 py-2">
                    <div className="flex-1 border-t border-gray-300"></div>
                    <span className="text-xs text-gray-500 px-2">
                      앱 열기(보조 수단)
                    </span>
                    <div className="flex-1 border-t border-gray-300"></div>
                  </div>

                  {/* 보조: 토스 & 카카오페이 */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* 토스 */}
                    <Button
                      onClick={handleOpenToss}
                      className="h-14 rounded-xl active:scale-[0.98] transition-all border-0 shadow-md"
                      style={{
                        backgroundColor: "#FFFFFF",
                        color: "#111827",
                        border: "1px solid #E5E7EB",
                      }}
                    >
                      <span className="flex h-7 w-[96px] items-center justify-center overflow-hidden">
                        {isTossLogoError ? (
                          <span
                            className="text-lg font-extrabold leading-none"
                            style={{ color: "#0064FF" }}
                          >
                            toss
                          </span>
                        ) : (
                          <img
                            src={tossLogo}
                            alt="토스"
                            className="h-full w-auto scale-[2.0] object-contain"
                            onError={() => setIsTossLogoError(true)}
                          />
                        )}
                      </span>
                    </Button>

                    {/* 카카오페이 */}
                    <Button
                      onClick={handleOpenKakaoPay}
                      className="h-14 rounded-xl active:scale-[0.98] transition-all border-0 shadow-md"
                      style={{
                        backgroundColor: "#FEE500",
                        color: "#000000",
                      }}
                    >
                      <span className="flex h-7 w-[96px] items-center justify-center overflow-hidden">
                        <img
                          src={kakaoPayLogo}
                          alt="카카오페이"
                          className="h-full w-auto object-contain"
                        />
                      </span>
                    </Button>
                  </div>

                  <p className="text-[11px] text-center text-gray-500">
                    앱이 열리면 복사된 계좌번호를 붙여넣어 송금해 주세요.
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 관리자 로그인 다이얼로그 */}
      <Dialog
        open={showAdminDialog}
        onOpenChange={setShowAdminDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>관리자 로그인</DialogTitle>
            <DialogDescription>
              관리자 비밀번호를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <Input
              type="password"
              placeholder="비밀번호"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdminLogin();
                }
              }}
              className="h-11 text-sm border-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleAdminLogin}
              className="w-full h-11 text-sm font-semibold rounded-xl shadow-lg active:scale-[0.98] transition-all"
              style={{ backgroundColor: "var(--lion-orange)" }}
            >
              <Lock className="mr-2 h-4 w-4" />
              로그인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}