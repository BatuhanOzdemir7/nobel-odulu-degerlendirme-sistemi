export type Rol = 'ADMIN' | 'KURULUS' | 'ADAY' | 'UZMAN';

export interface AuthUser {
  kullaniciId: number | null;
  kullaniciAdi: string;
  rol: Rol;
  kurulusNo: number | null;
  adayId: number | null;
  uzmanId: number | null;
  displayName: string;
}

export interface LoginRequest {
  kullaniciAdi: string;
  sifre: string;
}

export interface DemoAccount {
  rol: Rol;
  id: number;
  displayName: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: AuthUser;
}
