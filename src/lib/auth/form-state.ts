/**
 * Shape of the login form's result. Kept out of actions.ts because a
 * "use server" module may only export async functions.
 */
export type AuthFormState = {
  status: "idle" | "error" | "check-email";
  message?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
    displayName?: string;
  };
};

export const initialAuthFormState: AuthFormState = { status: "idle" };
