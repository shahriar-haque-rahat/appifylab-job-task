"use client";

import { Provider } from "react-redux";
import { store } from "./store";
import { AuthBootstrap } from "./AuthBootstrap";
import { ToastViewport } from "@/components/ui/Toast";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      {children}
      <ToastViewport />
    </Provider>
  );
}
