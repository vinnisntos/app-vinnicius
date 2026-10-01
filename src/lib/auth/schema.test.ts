import { describe, expect, it } from "vitest";
import { signUpSchema } from "./schema";

const validSignUp = {
  full_name: "Ana Silva",
  email: "ana@exemplo.com",
  phone: "(11) 99999-9999",
  password: "senha-segura-123",
  confirm_password: "senha-segura-123",
};

describe("signUpSchema", () => {
  it("aceita senhas iguais", () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it("aponta senhas diferentes no campo de confirmação", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, confirm_password: "outra-senha" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        path: ["confirm_password"],
        message: "As senhas não conferem.",
      }));
    }
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, password: "curta", confirm_password: "curta" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === "password")).toBe(true);
  });

  it("rejeita e-mail sem @", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, email: "ana.exemplo.com" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === "email")).toBe(true);
  });

  it("converte celular vazio para null", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, phone: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBeNull();
  });
});
