import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendSuccessResponse = <T>(res: Response, data?: T, message: string = 'Success'): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data
  };
  res.status(200).json(response);
};

export const sendErrorResponse = (res: Response, message: string, statusCode: number = 500): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: message
  };
  res.status(statusCode).json(response);
};

export const sendCreatedResponse = <T>(res: Response, data?: T, message: string = 'Resource created successfully'): void => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data
  };
  res.status(201).json(response);
};

export const sendNotFoundResponse = (res: Response, message: string = 'Resource not found'): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: message
  };
  res.status(404).json(response);
};

export const sendValidationErrorResponse = (res: Response, message: string = 'Validation error'): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: message
  };
  res.status(400).json(response);
};

export const sendUnauthorizedResponse = (res: Response, message: string = 'Unauthorized'): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: message
  };
  res.status(401).json(response);
};

export const sendForbiddenResponse = (res: Response, message: string = 'Forbidden'): void => {
  const response: ApiResponse = {
    success: false,
    message,
    error: message
  };
  res.status(403).json(response);
};
