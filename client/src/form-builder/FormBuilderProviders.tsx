import { ReactNode } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastContainer } from "react-toastify";
import formBuilderSlice from "../json-form-builder/store/slice.js";
import "react-toastify/dist/ReactToastify.css";

const store = configureStore({
  reducer: {
    formBuilder: formBuilderSlice
  }
});

const theme = createTheme({
  palette: {
    mode: "light"
  }
});

export function FormBuilderProviders({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        <ToastContainer position="top-right" />
      </ThemeProvider>
    </Provider>
  );
}
