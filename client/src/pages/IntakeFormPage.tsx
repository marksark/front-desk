import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Link,
  Snackbar,
  Stack,
  Typography
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import validator from "@rjsf/validator-ajv8";
import FormWithWidgets from "../json-form-builder/forms/FormWithWidgets";
import { useTenant } from "../tenant/TenantContext";

const theme = createTheme({
  palette: { mode: "light" }
});

type FormTemplateResponse = {
  template: { jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown> };
};

export function IntakeFormPage() {
  const { tenantId } = useTenant();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jsonSchema, setJsonSchema] = useState<Record<string, unknown> | null>(null);
  const [uiSchema, setUiSchema] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>(
    { open: false, message: "", severity: "success" }
  );

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setJsonSchema(null);
    setUiSchema(null);
    try {
      const response = await fetch(`/api/form-template/${encodeURIComponent(tenantId)}`);
      if (response.status === 404) {
        setError(
          "This school has not published an intake form yet. Please check back later or contact the office."
        );
        return;
      }
      if (!response.ok) {
        setError("We could not load the form. Please try again in a moment.");
        return;
      }
      const data = (await response.json()) as FormTemplateResponse;
      setJsonSchema(data.template.jsonSchema);
      setUiSchema(data.template.uiSchema);
    } catch {
      setError("We could not load the form. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  const handleSubmit = useCallback(
    async ({ formData }: { formData: Record<string, unknown> }) => {
      if (isSubmitting) {
        return;
      }
      setIsSubmitting(true);
      try {
        const response = await fetch(`/api/form-submissions/${encodeURIComponent(tenantId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formData })
        });
        if (response.status === 404) {
          setSnackbar({
            open: true,
            message: "This form is no longer available. Please contact the school.",
            severity: "error"
          });
          return;
        }
        if (!response.ok) {
          let message = "Could not send your form. Please try again.";
          try {
            const payload = (await response.json()) as { error?: string };
            if (typeof payload.error === "string" && payload.error.trim().length > 0) {
              message = payload.error;
            }
          } catch {
            // keep default
          }
          setSnackbar({ open: true, message, severity: "error" });
          return;
        }
        setSnackbar({
          open: true,
          message: "Thank you! Your form was submitted.",
          severity: "success"
        });
      } catch {
        setSnackbar({
          open: true,
          message: "Could not send your form. Please check your connection and try again.",
          severity: "error"
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, tenantId]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Box className="intake-page">
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Stack spacing={2}>
            <Typography component="h1" variant="h4">
              Intake form
            </Typography>
            <Typography color="text.secondary" variant="body2">
              School: <strong>{tenantId}</strong>
            </Typography>
            <Typography variant="body2">
              <Link href="/" underline="hover">
                Back to home
              </Link>
              {" · "}
              <Link href="/chat" underline="hover">
                AI chat
              </Link>
            </Typography>
          </Stack>
        </Container>

        <div className="intake-form-shell">
          {isLoading ? (
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              minHeight="40vh"
            >
              <CircularProgress aria-label="Loading form" />
            </Box>
          ) : null}

          {error && !isLoading ? (
            <Box px={2}>
              <Alert severity="info" sx={{ maxWidth: 600, mx: "auto" }}>
                {error}
              </Alert>
            </Box>
          ) : null}

          {jsonSchema && uiSchema && !isLoading ? (
            <div className="intake-rjsf-wrap">
              <FormWithWidgets
                schema={jsonSchema}
                uiSchema={uiSchema}
                validator={validator}
                onSubmit={handleSubmit}
                liveValidate
              />
            </div>
          ) : null}
        </div>
      </Box>
    </ThemeProvider>
  );
}
