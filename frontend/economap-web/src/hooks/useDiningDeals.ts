import { Deal } from "@/types/Deals";

const diningDeals: Deal[] = [
  {
    id: "dining-1",
    title: "McDonald's - Free Big Mac",
    description: "Get a free Big Mac with any purchase.",
    vendor: "McDonald's",
    price: 5,
    discountedPrice: 0,
    sponsored: true,
  },
  {
    id: "dining-2",
    title: "Taco Bell - 15% off on your order",
    description: "Get 15% off on your total order.",
    vendor: "Taco Bell",
    price: 20,
    discountedPrice: 17,
    sponsored: false,
  },
];

export const useDiningDeals = () => {
  return {
    data: diningDeals,
    isLoading: false,
    isError: false,
  };
};
