import { Request } from 'express';

export interface UserRequestType extends Request {
  user: {
    _id: string;
    email: string;
    username: string;
    apiKey: string;
    token: string;
  };
}
