'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  QrCode,
  Phone,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRDisplay from '@/components/QRDisplay';

interface DutyRecord {
  id: number;
  assigned_staff_name: string;
  department: string;
  hall: string;
  duty_date: string;
  reported_staff_name: string | null;
  checkin_time: string | null;
  submission_time: string | null;
  mobile_number: string | null;
}

export default function QRCheckInPage() {
  const [step, setStep] = useState<
    'scan' | 'verify' | 'submit' | 'success' | 'proxy' | 'reported'
  >('scan');
  const [mobileNumber, setMobileNumber] = useState('');
  const [attendanceType, setAttendanceType] = useState<'normal' | 'proxy'>(
    'normal'
  );
  const [absentTeacherMobile, setAbsentTeacherMobile] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [absentTeacher, setAbsentTeacher] = useState<any>(null);
  const [currentDuty, setCurrentDuty] = useState<DutyRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [isScannerSimulated, setIsScannerSimulated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTodayDuty = async () => {
      try {
       const response = await fetch('https://projectdemobackend-production.up.railway.app/duty/today');
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            // Set exam session info based on today's duty
            setExamSession({
              exam_name: 'Daily Invigilation Duty',
              time_slot: '09:00 AM - 12:00 PM',
              date: data[0].duty_date,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching today's duty:", error);
      }
    };
    fetchTodayDuty();
  }, []);

  // Debug: Log current duty changes
  useEffect(() => {
    if (currentDuty) {
      console.log('Current duty updated:', currentDuty);
    }
  }, [currentDuty]);

  // Debug: Log step changes
  useEffect(() => {
    console.log('Step changed to:', step);
    if (step === 'submit' && mobileNumber) {
      console.log('Entering submit step, refreshing data for:', mobileNumber);
      // Refresh data when entering submit step
      refreshDutyData(mobileNumber);
    }
  }, [step, mobileNumber]);

  const [examSession, setExamSession] = useState<any>(null);

  // Helper function to refresh duty data
  const refreshDutyData = async (mobileNumber: string) => {
    try {
      console.log('Refreshing duty data for mobile:', mobileNumber);
      const response = await fetch(
        `http://localhost:3000/duty/check-mobile/${mobileNumber}`
      );
      if (response.ok) {
        const result = await response.json();
        console.log('Refresh response:', result);
        if (result.exists) {
          console.log('Refreshed duty data:', result.duty);
          // Force immediate state update
          setCurrentDuty(result.duty);
          console.log('State updated with:', result.duty);
          return result.duty;
        }
      } else {
        console.error('Refresh failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error refreshing duty data:', error);
    }
    return null;
  };

  const handleQRScan = () => {
    setIsScannerSimulated(true);
    toast({
      title: 'QR Code Scanned',
      description: 'Please enter your mobile number to verify identity',
    });
    setAttendanceType('normal');
    setStep('verify');
  };

  const handleMobileVerification = async () => {
    setLoading(true);

    try {
      // First check if mobile number already exists in today's duty
      const checkResponse = await fetch(
        `http://localhost:3000/duty/check-mobile/${mobileNumber}`
      );

      if (!checkResponse.ok) {
        toast({
          title: 'Error',
          description: 'Failed to check mobile number. Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const checkResult = await checkResponse.json();

      if (checkResult.exists) {
        // Mobile number already exists - check if they've submitted
        if (checkResult.alreadySubmitted) {
          // Already submitted - show thank you message
          setCurrentDuty(checkResult.duty);
          setStep('success');
          toast({
            title: 'Already Submitted',
            description: 'You have already submitted papers today. Thank you!',
          });
        } else {
          // Reported but not submitted - go to submission
          // Refresh duty data to ensure we have the most recent data
          await refreshDutyData(mobileNumber);
          setStep('submit');
          toast({
            title: 'Already Reported',
            description:
              'You have already reported. Please proceed to submit papers.',
          });
        }
        setLoading(false);
        return;
      }

      // Mobile number doesn't exist - get staff info and proceed with reporting
      const staffResponse = await fetch(
        `http://localhost:3000/staff/by-mobile/${mobileNumber}`
      );

      if (!staffResponse.ok) {
        if (staffResponse.status === 404) {
          toast({
            title: 'Staff Not Found',
            description:
              'Mobile number not found in staff database. Please check the number and try again.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Verification Failed',
            description:
              'Error connecting to server. Please check if backend is running.',
            variant: 'destructive',
          });
        }
        setLoading(false);
        return;
      }

      const teacher = await staffResponse.json();
      setCurrentTeacher(teacher);

      // Set current duty from teacher data
      setCurrentDuty({
        id: 0, // Will be set by backend
        assigned_staff_name: teacher.name,
        department: teacher.department,
        hall: teacher.hall,
        duty_date: teacher.duty_date,
        reported_staff_name: null,
        checkin_time: null,
        submission_time: null,
        mobile_number: teacher.mobile_no,
      });

      // Report for duty - just send mobile number
      try {
        const reportResponse = await fetch(
          'http://localhost:3000/duty/report',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mobile_number: mobileNumber,
            }),
          }
        );

        if (reportResponse.ok) {
          const reportResult = await reportResponse.json();
          console.log('Report successful, result:', reportResult);

          // Add a small delay to ensure backend has processed the update
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Refresh duty data to get the latest check-in time
          const refreshedDuty = await refreshDutyData(mobileNumber);
          console.log('Refreshed duty data after report:', refreshedDuty);

          // Force update the currentDuty state with the refreshed data
          if (refreshedDuty) {
            setCurrentDuty(refreshedDuty);
            console.log('Force updated currentDuty:', refreshedDuty);
          }

          setStep('submit'); // Go to submit step to show papers submission
          toast({
            title: 'Successfully Reported',
            description:
              'You have been marked as present. You can now collect papers.',
          });
        } else {
          const errorData = await reportResponse.json();
          console.error('Reporting error details:', errorData);
          toast({
            title: 'Reporting Failed',
            description: errorData.message || 'Failed to report for duty',
            variant: 'destructive',
          });
        }
      } catch (reportError) {
        console.error('Error reporting for duty:', reportError);
        toast({
          title: 'Reporting Error',
          description: 'Failed to report for duty. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Network error:', error);
      toast({
        title: 'Connection Error',
        description:
          'Cannot connect to server. Please ensure the backend is running on port 3000.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleSubmitPapers = async () => {
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/duty/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_number: mobileNumber,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Submit successful, result:', result);
        
        // Refresh duty data to get the latest submission time
        const refreshedDuty = await refreshDutyData(mobileNumber);
        console.log('Refreshed duty data after submit:', refreshedDuty);
        
        setStep('success');
        toast({
          title: 'Papers Submitted Successfully',
          description: 'Thank you for completing your duty!',
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Submission Failed',
          description: errorData.message || 'Failed to submit papers',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting papers:', error);
      toast({
        title: 'Submission Error',
        description: 'Failed to submit papers. Please try again.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleProxyCheckIn = async () => {
    setLoading(true);

    try {
      // First verify the proxy staff
      const proxyResponse = await fetch(
        `http://localhost:3000/staff/by-mobile/${mobileNumber}`
      );

      if (!proxyResponse.ok) {
        toast({
          title: 'Proxy Staff Not Found',
          description: 'Your mobile number not found in staff database.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const proxyTeacher = await proxyResponse.json();
      setCurrentTeacher(proxyTeacher);

      // Verify the absent staff
      const absentResponse = await fetch(
        `http://localhost:3000/staff/by-mobile/${absentTeacherMobile}`
      );

      if (!absentResponse.ok) {
        toast({
          title: 'Absent Teacher Not Found',
          description:
            "Absent teacher's mobile number not found in staff database.",
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const absent = await absentResponse.json();
      setAbsentTeacher(absent);

      // Get today's duty for absent teacher
      const dutyResponse = await fetch('http://localhost:3000/duty/today');
      if (dutyResponse.ok) {
        const dutyData = await dutyResponse.json();
        const duty = dutyData.find(
          (d: DutyRecord) => d.assigned_staff_name === absent.name
        );
        setCurrentDuty(duty);
      }

      // Process proxy check-in
      const proxyCheckInResponse = await fetch(
        'http://localhost:3000/duty/proxy',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            absent_staff_name: absent.name,
            absent_department: absent.department,
            absent_hall: currentDuty?.hall || 'TBD',
            proxy_staff_name: proxyTeacher.name,
            proxy_mobile_number: mobileNumber,
            emergency_reason: emergencyReason,
          }),
        }
      );

      if (proxyCheckInResponse.ok) {
        const result = await proxyCheckInResponse.json();
        // Refresh duty data to get the latest check-in time
        await refreshDutyData(mobileNumber);
        setStep('success');
        toast({
          title: 'Proxy Check-in Successful',
          description:
            'Successfully processed proxy check-in for absent colleague.',
        });
      } else {
        const errorData = await proxyCheckInResponse.json();
        toast({
          title: 'Proxy Check-in Failed',
          description: errorData.message || 'Failed to process proxy check-in',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error processing proxy check-in:', error);
      toast({
        title: 'Proxy Error',
        description: 'Failed to process proxy check-in. Please try again.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  if (step === 'scan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        {/* Admin Dashboard Link */}
        <div className="absolute top-4 right-4">
          <Button
            variant="outline"
            onClick={() => window.open('/admin', '_blank')}
            className="bg-white/80 backdrop-blur-sm"
          >
            Admin Dashboard
          </Button>
        </div>

        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <QrCode className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">
                Invigilation Duty Check-in
              </CardTitle>
              <CardDescription>
                {examSession?.exam_name} - {examSession?.time_slot}
                {examSession?.date && <br />}
                {examSession?.date && `Date: ${examSession.date}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">QR Code Scanner</p>
                  </div>
                </div>
                <Button onClick={handleQRScan} className="w-full" size="lg">
                  Simulate QR Scan
                </Button>
              </div>

              {!isScannerSimulated && (
                <div className="pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent mt-2"
                    onClick={() => {
                      setAttendanceType('proxy');
                      setStep('proxy');
                    }}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Proxy Check-in for Absent Colleague
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Verify Identity
              </CardTitle>
              <CardDescription>
                Enter your mobile number to verify your identity and report for
                duty
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Your Mobile Number</Label>
                <Input
                  id="mobile"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  maxLength={10}
                />
              </div>

              <Button
                onClick={handleMobileVerification}
                className="w-full"
                disabled={mobileNumber.length !== 10 || loading}
              >
                {loading ? 'Verifying...' : 'Verify & Report'}
              </Button>

              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                variant="outline"
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'submit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Submit Papers
              </CardTitle>
              <CardDescription>
                You have successfully reported. Now please submit the collected
                papers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm font-medium">Reported Staff:</p>
                <p className="text-lg">
                  {currentDuty?.assigned_staff_name ||
                    currentDuty?.reported_staff_name ||
                    currentTeacher?.name}
                </p>
                <p className="text-sm text-gray-600">
                  Department:{' '}
                  {currentDuty?.department || currentTeacher?.department}
                </p>
                <p className="text-sm text-gray-600">
                  Hall: {currentDuty?.hall}
                </p>
                <p className="text-sm text-gray-600">
                  Mobile:{' '}
                  {currentDuty?.mobile_number || currentTeacher?.mobile_no}
                </p>
                <p className="text-sm text-gray-600">
                  Reported at: {currentDuty?.checkin_time || 'Not set'}
                </p>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  You have been marked as present. Please collect all answer
                  sheets and submit them.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSubmitPapers}
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Submit Papers'}
              </Button>

              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                variant="outline"
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'proxy') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Proxy Check-in
              </CardTitle>
              <CardDescription>
                Check-in on behalf of an absent colleague
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Emergency proxy check-in procedure. Additional verification
                  required.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="proxy-mobile">Your Mobile Number (Proxy)</Label>
                <Input
                  id="proxy-mobile"
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="absent-mobile">Absent Teacher's Mobile</Label>
                <Input
                  id="absent-mobile"
                  type="tel"
                  placeholder="Enter absent teacher's mobile"
                  value={absentTeacherMobile}
                  onChange={(e) => setAbsentTeacherMobile(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Emergency Reason</Label>
                <Select
                  value={emergencyReason}
                  onValueChange={setEmergencyReason}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical">Medical Emergency</SelectItem>
                    <SelectItem value="family">Family Emergency</SelectItem>
                    <SelectItem value="transport">Transport Issues</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleProxyCheckIn}
                className="w-full"
                disabled={
                  !mobileNumber ||
                  !absentTeacherMobile ||
                  !emergencyReason ||
                  loading
                }
              >
                {loading ? 'Processing...' : 'Confirm Proxy Check-in'}
              </Button>

              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setAbsentTeacherMobile('');
                  setEmergencyReason('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                variant="outline"
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'reported') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-blue-800">
                Successfully Reported!
              </CardTitle>
              <CardDescription className="text-blue-700">
                You have been marked as present
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold mb-2">Duty Details</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Staff:</strong> {currentDuty?.assigned_staff_name}
                  </p>
                  <p>
                    <strong>Department:</strong> {currentDuty?.department}
                  </p>
                  <p>
                    <strong>Hall:</strong> {currentDuty?.hall}
                  </p>
                  <p>
                    <strong>Mobile:</strong> {currentDuty?.mobile_number}
                  </p>
                  <p>
                    <strong>Date:</strong> {currentDuty?.duty_date}
                  </p>
                  {currentDuty?.checkin_time && (
                    <p>
                      <strong>Reported at:</strong> {currentDuty.checkin_time}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="mt-2">
                  Reported
                </Badge>
              </div>
              <div className="text-center text-sm text-gray-600">
                <p>You can now collect answer sheets.</p>
                <p>Scan QR code again when ready to submit papers.</p>
              </div>
              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Thank You!</CardTitle>
              <CardDescription>
                {currentDuty?.submission_time
                  ? 'Papers submitted successfully!'
                  : 'Check-in completed successfully!'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-2">Duty Details</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Assigned:</strong>{' '}
                    {currentDuty?.assigned_staff_name}
                  </p>
                  <p>
                    <strong>Reported:</strong>{' '}
                    {currentDuty?.reported_staff_name}
                  </p>
                  <p>
                    <strong>Department:</strong> {currentDuty?.department}
                  </p>
                  <p>
                    <strong>Hall:</strong> {currentDuty?.hall}
                  </p>
                  <p>
                    <strong>Mobile:</strong> {currentDuty?.mobile_number}
                  </p>
                  <p>
                    <strong>Date:</strong> {currentDuty?.duty_date}
                  </p>
                  {currentDuty?.checkin_time && (
                    <p>
                      <strong>Reported at:</strong> {currentDuty.checkin_time}
                    </p>
                  )}
                  {currentDuty?.submission_time && (
                    <p>
                      <strong>Submitted at:</strong>{' '}
                      {currentDuty.submission_time}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="mt-2">
                  {currentDuty?.submission_time ? 'Completed' : 'Reported'}
                </Badge>
              </div>

              <Button
                onClick={() => {
                  setStep('scan');
                  setMobileNumber('');
                  setCurrentTeacher(null);
                  setAbsentTeacher(null);
                  setCurrentDuty(null);
                  setIsScannerSimulated(false);
                }}
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
