import { User } from "@/types/User";

const user: User = {
  id: "user-1",
  name: "John Doe",
  email: "john.doe@example.com",
  premiumSubscriber: false,
};

export const useUser = () => {
  return {
    data: user,
    isLoading: false,
    isError: false,
  };
};
