import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router';
import { 
  Upload, 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  Trash2,
  FileSpreadsheet,
  RefreshCw,
  Users,
  TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { api, adminSession, type PaymentSubmission } from '../lib/api';

export default function Admin() {
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [csvText, setCsvText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!adminSession.hasPassword()) {
      toast.error('관리자 인증이 필요합니다');
      navigate('/');
      return;
    }

    loadSubmissions();
  }, [navigate]);

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const response = await api.getAllSubmissions();
      setSubmissions(response.submissions || []);
    } catch (error: any) {
      console.error('Failed to load submissions:', error);
      if (error?.message === 'Unauthorized' || error?.message?.includes('401')) {
        adminSession.clear();
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요');
        navigate('/');
        return;
      }
      toast.error('데이터 로드 실패', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCSVProcess = async () => {
    if (!csvText.trim()) {
      toast.error('CSV 데이터를 입력해주세요');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      const entries = lines
        .map((line) => {
          const [name, amountStr] = line.split(',').map((s) => s.trim());
          const amount = parseInt(amountStr);
          return name && amount ? { name, amount } : null;
        })
        .filter((entry): entry is { name: string; amount: number } => entry !== null);

      if (entries.length === 0) {
        toast.error('유효한 데이터가 없습니다');
        return;
      }

      const response = await api.matchCSV(entries);
      toast.success(`${response.matchedCount}건의 입금이 확인되었습니다`);
      
      loadSubmissions();
      setCsvText('');
    } catch (error: any) {
      console.error('CSV processing failed:', error);
      if (error?.message === 'Unauthorized' || error?.message?.includes('401')) {
        adminSession.clear();
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요');
        navigate('/');
        return;
      }
      toast.error('CSV 처리 실패', {
        description: error.message,
      });
    }
  };

  const handleStatusToggle = async (studentId: string, currentStatus: 'pending' | 'confirmed') => {
    const newStatus = currentStatus === 'pending' ? 'confirmed' : 'pending';
    
    try {
      await api.updateSubmissionStatus(studentId, newStatus);
      toast.success(
        newStatus === 'confirmed' ? '입금 완료로 변경되었습니다' : '확인 대기로 변경되었습니다'
      );
      loadSubmissions();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      if (error?.message === 'Unauthorized' || error?.message?.includes('401')) {
        adminSession.clear();
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요');
        navigate('/');
        return;
      }
      toast.error('상태 변경 실패', {
        description: error.message,
      });
    }
  };

  const handleClearAll = async () => {
    if (!confirm('모든 데이터를 삭제하시겠습니까?')) return;

    try {
      const response = await api.deleteAllSubmissions();
      toast.success(`${response.deletedCount}건의 데이터가 삭제되었습니다`);
      loadSubmissions();
    } catch (error: any) {
      console.error('Failed to delete all:', error);
      if (error?.message === 'Unauthorized' || error?.message?.includes('401')) {
        adminSession.clear();
        toast.error('인증이 만료되었습니다. 다시 로그인해주세요');
        navigate('/');
        return;
      }
      toast.error('삭제 실패', {
        description: error.message,
      });
    }
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const confirmedCount = submissions.filter((s) => s.status === 'confirmed').length;
  const totalAmount = submissions
    .filter((s) => s.status === 'confirmed')
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'var(--deep-navy)' }}>
      {/* 배경 효과 */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12"
        >
          <Link to="/">
            <Button variant="ghost" className="text-white hover:bg-white/10 mb-4 md:mb-6 -ml-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              메인으로
            </Button>
          </Link>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1">운영진 대시보드</h1>
              <p className="text-sm md:text-base text-gray-400">입금 내역 관리 및 확인</p>
            </div>
            <Button
              onClick={loadSubmissions}
              className="bg-white/10 hover:bg-white/20 text-white border-0 h-10"
              disabled={isLoading}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 md:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">새로고침</span>
            </Button>
          </div>
        </motion.div>

        {/* 통계 카드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 md:gap-6 mb-8 md:mb-12"
        >
          <Card className="p-4 md:p-6 bg-white/5 border-0 backdrop-blur-xl hover:bg-white/10 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between md:justify-start md:gap-2">
                <Clock className="h-4 w-4 text-orange-400 flex-shrink-0" />
                <p className="text-[10px] md:text-sm text-gray-400">대기 중</p>
              </div>
              <p className="text-2xl md:text-4xl font-bold text-orange-400">{pendingCount}</p>
            </div>
          </Card>

          <Card className="p-4 md:p-6 bg-white/5 border-0 backdrop-blur-xl hover:bg-white/10 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between md:justify-start md:gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--success-green)' }} />
                <p className="text-[10px] md:text-sm text-gray-400">완료</p>
              </div>
              <p className="text-2xl md:text-4xl font-bold" style={{ color: 'var(--success-green)' }}>
                {confirmedCount}
              </p>
            </div>
          </Card>

          <Card className="p-4 md:p-6 bg-white/5 border-0 backdrop-blur-xl hover:bg-white/10 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between md:justify-start md:gap-2">
                <TrendingUp className="h-4 w-4 text-white flex-shrink-0" />
                <p className="text-[10px] md:text-sm text-gray-400">총액</p>
              </div>
              <p className="text-xl md:text-4xl font-bold text-white">
                {(totalAmount / 10000).toFixed(0)}<span className="text-sm md:text-2xl">만</span>
              </p>
            </div>
          </Card>
        </motion.div>

        {/* CSV 업로드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Card className="p-8 bg-white/5 border-0 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6" style={{ color: 'var(--lion-orange)' }} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">입금 내역 자동 매칭</h2>
                <p className="text-sm text-gray-400 mt-1">
                  은행 입금 내역을 "이름,금액" 형식으로 입력하세요
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <textarea
                className="w-full p-5 rounded-xl bg-white/5 border-2 border-white/10 text-white placeholder-gray-500 min-h-[180px] font-mono text-sm focus:border-orange-500/50 focus:outline-none transition-all"
                placeholder="홍길동,30000&#10;김철수,40000&#10;이영희,30000"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />

              <Button
                onClick={handleCSVProcess}
                className="w-full h-14 text-lg font-semibold rounded-xl"
                style={{ backgroundColor: 'var(--lion-orange)' }}
              >
                <Upload className="mr-2 h-5 w-5" />
                자동 매칭 실행
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* 제출 내역 리스트 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-8 bg-white/5 border-0 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">전체 제출 내역</h2>
                  <p className="text-sm text-gray-400">{submissions.length}건</p>
                </div>
              </div>
              <Button
                onClick={handleClearAll}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border-0"
                size="sm"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                전체 삭제
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-16 text-gray-400">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                로딩 중...
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-16">
                <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">아직 제출된 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((submission) => (
                    <motion.div
                      key={submission.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {submission.status === 'confirmed' ? (
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                              <CheckCircle2
                                className="h-5 w-5"
                                style={{ color: 'var(--success-green)' }}
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                              <Clock className="h-5 w-5 text-orange-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                              <span className="text-white font-semibold text-lg">{submission.name}</span>
                              <span className="text-gray-400 text-sm">
                                {submission.studentId}
                              </span>
                              <span
                                className="text-base font-bold px-3 py-1 rounded-full bg-orange-500/10"
                                style={{ color: 'var(--lion-orange)' }}
                              >
                                {submission.amount.toLocaleString()}원
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(submission.timestamp).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleStatusToggle(submission.studentId, submission.status)}
                          className="rounded-lg font-semibold"
                          style={{
                            backgroundColor:
                              submission.status === 'confirmed'
                                ? 'var(--success-green)'
                                : 'var(--lion-orange)',
                          }}
                        >
                          {submission.status === 'confirmed' ? '완료됨' : '대기중'}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}