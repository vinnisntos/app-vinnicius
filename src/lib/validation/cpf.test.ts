import { describe, expect, it } from "vitest";
import { isValidCpf, normalizeCpf } from "./cpf";

describe("isValidCpf", () => {
  it("aceita CPF válido com e sem máscara", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("rejeita dígito verificador errado", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("rejeita sequências repetidas e tamanho errado", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
    expect(isValidCpf("")).toBe(false);
  });

  it("normaliza removendo tudo que não é dígito", () => {
    expect(normalizeCpf(" 529.982.247-25 ")).toBe("52998224725");
  });
});
