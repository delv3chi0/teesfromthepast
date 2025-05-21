import { Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  return <Button onClick={handleLogout}>Logout</Button>;
}
