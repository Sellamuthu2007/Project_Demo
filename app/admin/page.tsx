// admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Phone,
  UserCheck,
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

export default function AdminDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [dutyRecords, setDutyRecords] = useState<DutyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch data from API
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all duty records
     const response = await fetch('https://projectdemobackend-production.up.railway.app/duty/all');
      if (response.ok) {
        const data = await response.json();
        setDutyRecords(data);
      } else {
        throw new Error('Failed to fetch duty records');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data from server',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleExport = () => {
    const data = {
      dutyRecords,
      exportDate: '2025-08-04',
      summary: {
        totalAssignments: dutyRecords.length,
        reported: dutyRecords.filter((d) => d.checkin_time).length,
        submitted: dutyRecords.filter((d) => d.submission_time).length,
        proxies: dutyRecords.filter(
          (d) =>
            d.reported_staff_name &&
            d.reported_staff_name !== d.assigned_staff_name
        ).length,
        absent: dutyRecords.filter((d) => !d.checkin_time).length,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invigilation-report-04-08-2025.json`;
    a.click();
  };

  const getStatusBadge = (record: DutyRecord) => {
    if (record.submission_time) {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
    } else if (record.checkin_time) {
      return <Badge className="bg-blue-100 text-blue-800">Reported</Badge>;
    } else {
      return <Badge className="bg-orange-100 text-orange-800">Absent</Badge>;
    }
  };

  const getProxyBadge = (record: DutyRecord) => {
    if (
      record.reported_staff_name &&
      record.reported_staff_name !== record.assigned_staff_name
    ) {
      return <Badge className="bg-purple-100 text-purple-800">Proxy</Badge>;
    }
    return null;
  };

  // Calculate statistics - hardcode to 04-08-2025 (August 4th)
  const dutyDate = '2025-08-04';

  const todayRecords = dutyRecords.filter(
    (record) => record.duty_date === dutyDate
  );

  const stats = {
    totalAssignments: todayRecords.length,
    reported: todayRecords.filter((record) => record.checkin_time).length,
    submitted: todayRecords.filter((record) => record.submission_time).length,
    proxies: todayRecords.filter(
      (record) =>
        record.reported_staff_name &&
        record.reported_staff_name !== record.assigned_staff_name
    ).length,
    absent: todayRecords.filter((record) => !record.checkin_time).length,
    pendingSubmission: todayRecords.filter(
      (record) => record.checkin_time && !record.submission_time
    ).length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Invigilation Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Real-time duty tracking and management - 04-08-2025
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex flex-col items-center">
              <p className="text-sm text-gray-600 mb-2">Scan to Access</p>
              <QRDisplay />
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Assignments
                  </p>
                  <p className="text-2xl font-bold">{stats.totalAssignments}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reported</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.reported}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Submitted</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.submitted}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Proxies</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.proxies}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Absent</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.absent}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Submission
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pendingSubmission}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Alerts */}
        {stats.absent > 0 && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {stats.absent} absent case(s) recorded. Review required.
            </AlertDescription>
          </Alert>
        )}

        {stats.pendingSubmission > 0 && (
          <Alert className="mb-6">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              {stats.pendingSubmission} staff member(s) have reported but not
              submitted papers yet.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="today" className="space-y-4">
          <TabsList>
            <TabsTrigger value="today">Today's Duty</TabsTrigger>
            <TabsTrigger value="all">All Records</TabsTrigger>
            <TabsTrigger value="proxies">Proxy Cases</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <Card>
              <CardHeader>
                <CardTitle>Today's Duty Status ({dutyDate})</CardTitle>
                <CardDescription>
                  Real-time duty tracking with proxy handling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assigned Staff</TableHead>
                      <TableHead>Reported Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Hall</TableHead>
                      <TableHead>Report Time</TableHead>
                      <TableHead>Submit Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mobile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.assigned_staff_name}
                            </p>
                            {getProxyBadge(record)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.reported_staff_name || 'Not Reported'}
                            </p>
                            {record.reported_staff_name &&
                              record.reported_staff_name !==
                                record.assigned_staff_name && (
                                <p className="text-sm text-purple-600">
                                  (Proxy)
                                </p>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>{record.department}</TableCell>
                        <TableCell>{record.hall}</TableCell>
                        <TableCell>
                          {record.checkin_time ? (
                            <span className="text-sm text-green-600">
                              {record.checkin_time}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Not reported
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.submission_time ? (
                            <span className="text-sm text-green-600">
                              {record.submission_time}
                            </span>
                          ) : record.checkin_time ? (
                            <span className="text-sm text-yellow-600">
                              Pending
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">
                              Not applicable
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 font-mono">
                            {record.mobile_number || 'N/A'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Duty Records</CardTitle>
                <CardDescription>
                  Complete history of all duty assignments and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Assigned Staff</TableHead>
                      <TableHead>Reported Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Hall</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mobile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dutyRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.duty_date}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.assigned_staff_name}
                            </p>
                            {getProxyBadge(record)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.reported_staff_name || 'Not Reported'}
                            </p>
                            {record.reported_staff_name &&
                              record.reported_staff_name !==
                                record.assigned_staff_name && (
                                <p className="text-sm text-purple-600">
                                  (Proxy)
                                </p>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>{record.department}</TableCell>
                        <TableCell>{record.hall}</TableCell>
                        <TableCell>{getStatusBadge(record)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600 font-mono">
                            {record.mobile_number || 'N/A'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proxies">
            <Card>
              <CardHeader>
                <CardTitle>Proxy Cases</CardTitle>
                <CardDescription>
                  All cases where proxy staff reported for absent colleagues
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Absent Staff</TableHead>
                      <TableHead>Proxy Staff</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Hall</TableHead>
                      <TableHead>Report Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dutyRecords
                      .filter(
                        (record) =>
                          record.reported_staff_name &&
                          record.reported_staff_name !==
                            record.assigned_staff_name
                      )
                      .map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.duty_date}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {record.assigned_staff_name}
                              </p>
                              <p className="text-sm text-orange-600">
                                (Absent)
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {record.reported_staff_name}
                              </p>
                              <p className="text-sm text-purple-600">(Proxy)</p>
                            </div>
                          </TableCell>
                          <TableCell>{record.department}</TableCell>
                          <TableCell>{record.hall}</TableCell>
                          <TableCell>
                            {record.checkin_time ? (
                              <span className="text-sm text-green-600">
                                {record.checkin_time}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">
                                Not reported
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(record)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
