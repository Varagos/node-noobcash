export const handleError = (error: unknown) => {
  // will be called after the message has been sent
  if (error) console.error('error:', error);
};
