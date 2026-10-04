import { createBrowserRouter } from "react-router";
import { Layout } from "./screens/Layout";
import { Notifications } from "./screens/Notifications";
import { RequestRide } from "./screens/RequestRide";
import { RideScreen } from "./screens/RideScreen";
import { Search } from "./screens/Search";

export function createAppRouter() {
  return createBrowserRouter([
    {
      element: <Layout />,
      children: [
        { path: "/", element: <Search /> },
        { path: "/request", element: <RequestRide /> },
        { path: "/ride/:id", element: <RideScreen /> },
        { path: "/notifications", element: <Notifications /> },
        { path: "/notifications/:id", element: <Notifications /> },
      ],
    },
  ]);
}
