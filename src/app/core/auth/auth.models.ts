export interface ApiResponse<T> {
  estado: string;
  codigo: number;
  message: string;
  data: T;
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  countryId: number;
  countryName: string;
  countryCode: string;
  documentType: string;
  documentTypeId: number;
  documentNumber: string;
  email: string;
  password: string;
}

export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AuthSession {
  id: number;
  email: string;
  academieId: number;
  personId: number;
  nombreCompleto: string;
  rol: string;
  membresia: string;
  token: string;
  refreshToken: string;
}

export interface RegisterResponse {
  userId: number;
  personId: number;
  academieId: number;
  rolAsignado: string;
  nombreCompleto: string;
}
