export function unwrapApiResponse<T>(response: unknown): T {
  if (response && typeof response === 'object') {
    const envelope = response as { data?: T; Data?: T };
    return (envelope.data ?? envelope.Data ?? response) as T;
  }
  return response as T;
}

