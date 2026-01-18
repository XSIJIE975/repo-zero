import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * @description 等待异步函数执行完成
 * @param promise 异步函数
 * @returns 异步函数执行结果
 */
export async function awaitWrap<T, E = Error>(
  promise: Promise<T>
): Promise<[E | null, T | null]> {
  try {
    const data = await promise
    return [null, data]
  } catch (error: unknown) {
    return [error as E, null]
  }
}