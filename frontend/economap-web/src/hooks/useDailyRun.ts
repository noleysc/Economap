import { Route, Stop } from "@/types/Routes";

const stops: Stop[] = [
  {
    id: "stop-1",
    name: "Shell",
    address: "123 Main St",
    type: "Gas",
    position: [51.505, -0.09],
  },
  {
    id: "stop-2",
    name: "Kroger",
    address: "456 Oak St",
    type: "Grocery",
    position: [51.51, -0.1],
  },
  {
    id: "stop-3",
    name: "McDonald's",
    address: "789 Pine St",
    type: "Dining",
    position: [51.515, -0.095],
  },
];

const dailyRun: Route = {
  id: "route-1",
  name: "Daily Run",
  stops: stops,
  optimizedRoute: [stops[0], stops[2], stops[1]],
};

export const useDailyRun = () => {
  return {
    data: dailyRun,
    isLoading: false,
    isError: false,
  };
};
