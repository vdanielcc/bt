export interface AuditedEntity {
  id: number;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface TrainingModality extends AuditedEntity {
  academyId: number;
  academyStyleId: number | null;
  code: string | null;
  name: string | null;
  description: string | null;
  minimumAge: number | null;
  maximumAge: number | null;
  isActive: boolean;
}

export interface AcademyRoom extends AuditedEntity {
  academyId: number;
  name: string | null;
  description: string | null;
  capacity: number | null;
  isActive: boolean;
}

export interface AcademyInstructor extends AuditedEntity {
  personName?: string | null;
  academyId: number;
  personId: number;
  title: string | null;
  licenseNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface PersonOption {
  id: number;
  firstName?: string;
  lastName?: string;
  nombreCompleto?: string;
  documentNumber?: string | null;
  [property: string]: unknown;
}

export interface AcademyClass extends AuditedEntity {
  academyId: number;
  trainingModalityId: number;
  code: string | null;
  name: string | null;
  description: string | null;
  defaultRoomId: number | null;
  capacity: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string | null;
  isActive: boolean;
}

export interface ClassSchedule extends AuditedEntity {
  classId: number;
  roomId: number | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
}

export type ClassStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';
export interface ClassReference { id: number; name: string; isActive: boolean; }
export interface AcademyClassListItem extends AcademyClass {
  activeEnrollmentCount?: number; occupiedEnrollmentCount?: number;
  name: string;
  status: ClassStatus;
  trainingModalityName: string;
  defaultRoomName: string | null;
  trainingModality: ClassReference;
  defaultRoom: ClassReference | null;
}
export interface AcademyClassRequest {
  code: string | null; name: string; description: string | null;
  trainingModalityId: number; defaultRoomId: number | null; capacity: number | null;
  startDate: string | null; endDate: string | null; status: ClassStatus;
}
export interface AcademyClassFilters { search?: string; status?: ClassStatus | ''; trainingModalityId?: number | null; roomId?: number | null; }
export interface AcademyClassSummary { total: number; active: number; inactive: number; closed: number; }

export interface AttendanceItemRequest {
  studentId: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | string;
  checkInAt: string | null;
  notes: string | null;
}

export interface ClassAttendance extends AttendanceItemRequest {
  id?: number;
  studentName?: string;
  checkOutAt?: string | null;
}

export interface ClassSession extends AuditedEntity {
  classId?: number;
  className?: string;
  roomId?: number | null;
  roomName?: string;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;
  [property: string]: unknown;
}

export interface ClassBillingPlan {
  classId: number;
  billingPlanId: number;
  isDefault: boolean;
  createdAt?: string;
}

export interface BillingPlan extends AuditedEntity {
  isDefault?: boolean;
  assignedClassesCount?: number;
  classes?: { classId: number; className: string; isDefault: boolean }[];
  academyId: number;
  code: string | null;
  name: string | null;
  description: string | null;
  billingCycle: 'MONTHLY' | 'PER_CLASS' | 'ONE_TIME' | string | null;
  amount: number;
  dueDay: number | null;
  graceDays: number;
  isActive: boolean;
  validFrom: string | null;
  validTo: string | null;
}

export interface BillingCharge extends AuditedEntity {
  academyId: number;
  studentId: number;
  billingConceptId: number;
  billingPlanId: number | null;
  classEnrollmentId: number | null;
  classSessionId: number | null;
  eventId: number | null;
  gradeHistoryId: number | null;
  referencePeriod: string | null;
  description: string | null;
  amount: number;
  discountAmount: number;
  surchargeAmount: number;
  dueDate: string | null;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'VOID' | string | null;
  generatedAutomatically: boolean;
  createdBy: number | null;
}

export interface BillingConcept {
  id: number;
  code?: 'MONTHLY_FEE' | 'ENROLLMENT_FEE' | 'CLASS_FEE' | 'EVENT_FEE' | 'EXAM_FEE' | 'OTHER' | string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface BillingPayment extends AuditedEntity {
  academyId: number;
  studentId: number | null;
  payerPersonId: number | null;
  amount: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'CARD' | 'WEBPAY' | 'OTHER' | string | null;
  status: string | null;
  transactionReference: string | null;
  receiptPath: string | null;
  paidAt: string;
  notes: string | null;
  createdBy: number | null;
}

export interface MartialArtStyle extends AuditedEntity {
  code: string | null;
  name: string | null;
  description: string | null;
  isActive: boolean;
}

export interface AcademyStyle extends AuditedEntity {
  academyId: number;
  styleId: number;
  sportsAssociationId: number | null;
  isPrimary: boolean;
  isActive: boolean;
}

export interface SportsAssociationOption { id: number; name: string; }

export interface GradingSystem extends AuditedEntity {
  sportsAssociationId: number;
  styleId: number;
  code: string | null;
  name: string | null;
  description: string | null;
  isActive: boolean;
}

export interface GradeLevel extends AuditedEntity {
  gradingSystemId: number;
  code: string | null;
  name: string | null;
  rankType: 'KYU' | 'DAN' | 'MON' | 'OTHER' | string | null;
  rankNumber: number | null;
  sortOrder: number;
  beltName: string | null;
  beltColorHex: string | null;
  minimumAge: number | null;
  minimumMonthsInPreviousGrade: number | null;
  description: string | null;
  isActive: boolean;
}

export interface StudentGradingProfile extends AuditedEntity {
  studentId: number;
  academyId: number;
  gradingSystemId: number;
  currentGradeLevelId: number | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
}

export interface StudentGradeHistory extends AuditedEntity {
  [property: string]: unknown;
}

export interface AcademyDashboardIdentity { id: number; name: string; logo: string | null; }
export interface AcademyDashboardAttendance { present: number; late: number; absent: number; excused: number; total: number; }
export interface AcademyDashboardBilling { collectedThisMonth: number; pending: number; overdue: number; paymentsToday: number; overdueStudents: number; }
export interface AcademyDashboardNotifications { pending: number; processing: number; sent: number; failed: number; }
export interface AcademyDashboardSession { id: number; classId: number; className: string; modality: string; room: string; instructor: string; sessionDate: string; startTime: string; endTime: string; status: string; enrolled: number; present: number; attendanceRecorded: number; }
export interface AcademyDashboardPayment { id: number; studentId: number | null; studentName: string; amount: number; paidAt: string; paymentMethod: string; concept: string | null; }
export interface AcademyDashboardOverdue { studentId: number; studentName: string; amount: number; oldestDueDate: string | null; overdueDays: number; }
export interface AcademyDashboardDue { chargeId: number; studentId: number; studentName: string; concept: string; amount: number; dueDate: string | null; }
export interface AcademyDashboardGrade { id: number; studentId: number; studentName: string; previousGrade: string | null; newGrade: string; effectiveDate: string; }
export interface AcademyDashboardNotification { id: number; type: string; recipient: string; channel: string | null; createdAt: string; status: string; }
export interface AcademyDashboardAlerts { overdueStudents: number; sessionsWithoutAttendance: number; classesWithoutInstructor: number; failedNotifications: number; }
export interface AcademyDashboard {
  academy: AcademyDashboardIdentity; activeStudents: number; studentsJoinedThisMonth: number;
  activeClasses: number; todayClasses: number; monthlyAttendancePercentage: number;
  todayAttendance: AcademyDashboardAttendance; monthlyAttendance: AcademyDashboardAttendance;
  billing: AcademyDashboardBilling; notifications: AcademyDashboardNotifications;
  todaySessions: AcademyDashboardSession[]; upcomingSessions: AcademyDashboardSession[];
  recentPayments: AcademyDashboardPayment[]; overdueStudents: AcademyDashboardOverdue[];
  upcomingDue: AcademyDashboardDue[]; recentGradeChanges: AcademyDashboardGrade[];
  recentNotifications: AcademyDashboardNotification[]; alerts: AcademyDashboardAlerts;
}

export type CreateEntity<T extends AuditedEntity> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

export interface PagedResult<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number; }

export interface ClassEnrollment extends AuditedEntity {
  classId: number; studentId: number; billingPlanId: number | null; enrollmentDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'WITHDRAWN' | 'COMPLETED' | string;
  notes: string | null; startDate: string; endDate: string | null; studentName?: string;
}

export interface ClassInstructorAssignment extends AuditedEntity {
  classId: number; academyInstructorId: number; role: 'HEAD_INSTRUCTOR' | 'INSTRUCTOR' | 'ASSISTANT' | string;
  isPrimary: boolean; startDate: string | null; endDate: string | null; status: string; instructorName?: string;
}

export interface ClassInstructorRequest {
  academyInstructorId: number;
  role: 'HEAD_INSTRUCTOR' | 'INSTRUCTOR' | 'ASSISTANT';
  isPrimary: boolean;
  startDate: string | null;
  endDate: string | null;
}

export interface NotificationRule extends AuditedEntity {
  academyId: number; notificationType: string; triggerType: string; offsetValue: number;
  offsetUnit: 'MINUTES' | 'HOURS' | 'DAYS' | string; sendEmail: boolean;
  sendWhatsapp: boolean; sendPush: boolean; sendInApp?:boolean;includeGuardians?:boolean;isActive: boolean;
}

export interface NotificationTemplate extends AuditedEntity {
  academyId: number | null; notificationType: string; channel: 'EMAIL' | 'WHATSAPP' | 'PUSH' | string;
  name: string; subjectTemplate: string | null; bodyTemplate: string; supportedVariables: string | null; isActive: boolean;
}

export interface NotificationDashboard { pending: number; processing: number; sent: number; failed: number; successRate: number; [key: string]: unknown; }

export type EnrollmentStatus = 'ACTIVE' | 'PAUSED' | 'WITHDRAWN' | 'COMPLETED';
export interface ClassEnrollmentListItem extends ClassEnrollment {
  studentName: string; documentNumber: string; billingPlanName: string | null;
  billingCycle?: string | null; billingPlanAmount?: number | null;
  className: string; classCode: string | null; academyId: number; trainingModalityName: string; scheduleSummary: string;
}
export interface CreateClassEnrollmentRequest { studentId: number; enrollmentDate: string; billingPlanId: number | null; notes: string | null; }
export interface UpdateClassEnrollmentRequest { startDate: string; endDate: string | null; status: string; billingPlanId: number | null; notes: string | null; }
export interface EnrollmentCandidate { studentId: number; fullName: string; documentNumber: string; }
export type StudentClassListItem = ClassEnrollmentListItem;
