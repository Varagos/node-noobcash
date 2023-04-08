import { InvalidArgumentError } from 'commander';

export const myParseInt = (value: string, dummyPrevious: any) => {
  console.log(value, typeof value);
  // parseInt takes a string and a radix
  // const parsedValue = parseInt(value, 10);
  const parsedValue = parseFloat(value);
  console.log(parsedValue, typeof parsedValue);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  }
  return parsedValue;
};
