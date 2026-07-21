import { Amplify } from "aws-amplify";
import {
  confirmResetPassword,
  getCurrentUser,
  resetPassword,
  signIn,
  signOut
} from "aws-amplify/auth";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "eu-west-3_YOYKIhAio",
      userPoolClientId: "7i8l0je74sh91v3g0rv2s1io2d",
      loginWith: {
        username: true
      }
    }
  }
});

export async function restoreSession() {
  try {
    const user = await getCurrentUser();
    return user.username;
  } catch {
    return null;
  }
}

export async function authenticate(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const result = await signIn({
    username: normalizedUsername,
    password,
    options: {
      authFlowType: "USER_PASSWORD_AUTH"
    }
  });

  if (!result.isSignedIn) {
    throw new Error(`AUTH_STEP:${result.nextStep.signInStep}`);
  }

  return normalizedUsername;
}

export async function requestPasswordReset(username: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const result = await resetPassword({ username: normalizedUsername });

  if (result.nextStep.resetPasswordStep !== "CONFIRM_RESET_PASSWORD_WITH_CODE") {
    throw new Error("Não foi possível iniciar a recuperação da palavra-passe.");
  }

  return {
    username: normalizedUsername,
    destination: result.nextStep.codeDeliveryDetails.destination ?? "o contacto registado"
  };
}

export async function completePasswordReset(username: string, code: string, newPassword: string) {
  await confirmResetPassword({
    username,
    confirmationCode: code.trim(),
    newPassword
  });
}

export async function endSession() {
  await signOut();
}

export function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Ocorreu um erro. Tente novamente.";
  }

  const messages: Record<string, string> = {
    NotAuthorizedException: "Utilizador ou palavra-passe incorretos.",
    UserNotFoundException: "O utilizador não existe.",
    UserNotConfirmedException: "A conta ainda não foi confirmada.",
    LimitExceededException: "Demasiadas tentativas. Aguarde um pouco e tente novamente.",
    TooManyRequestsException: "Demasiadas tentativas. Aguarde um pouco e tente novamente.",
    CodeMismatchException: "O código introduzido não é válido.",
    ExpiredCodeException: "O código expirou. Solicite um novo código.",
    InvalidPasswordException: "A nova palavra-passe não cumpre os requisitos de segurança.",
    NetworkError: "Sem ligação ao serviço. Verifique a internet e tente novamente."
  };

  if (error.message.startsWith("AUTH_STEP:")) {
    return "A conta requer um passo adicional de autenticação ainda não suportado nesta versão.";
  }

  return messages[error.name] ?? error.message ?? "Ocorreu um erro. Tente novamente.";
}
