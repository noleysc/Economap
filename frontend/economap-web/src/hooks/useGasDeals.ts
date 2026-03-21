import { Deal } from "@/types/Deals";

const gasDeals: Deal[] = [
  {
    id: "gas-1",
    title: "Shell - 10 cents off per gallon",
    description: "Get 10 cents off per gallon at Shell stations.",
    vendor: "Shell",
    price: 3.50,
    discountedPrice: 3.40,
    sponsored: true,
  },
  {
    id: "gas-2",
    title: "Exxon - 5 cents off per gallon",
    description: "Get 5 cents off per gallon at Exxon stations.",
    vendor: "Exxon",
    price: 3.55,
    discountedPrice: 3.50,
    sponsored: false,
  },
];

export const useGasDeals = () => {
  return {
    data: gasDeals,
    isLoading: false,
    isError: false,
  };
};
