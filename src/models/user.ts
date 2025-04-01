
export interface User {
    id: number;
    username: string;
    role: 'admin' | 'teacher' | 'student' | 'demo';
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
}
