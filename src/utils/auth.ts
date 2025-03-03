import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';

export const encryptPassword = (password: string, salt: number = 8): Promise<string> => bcrypt.hash(password, salt)

export const encryptPasswordSync = (password: string, salt: number = 8): string => bcrypt.hashSync(password, salt)

export const decryptPassword = (password: string, hashedPassword: string): boolean => bcrypt.compareSync(password, hashedPassword)

export const createToken = (user: any): string => {
    const { id, email } = user;
    return jwt.sign({ id, email}, process.env.JWT_SECRET!, { expiresIn: '50d' });
};