"use client";

import { Provider } from "react-redux";
import { store } from "./store";
import { AuthBootstrap } from "./AuthBootstrap";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      {children}
    </Provider>
  );
}
