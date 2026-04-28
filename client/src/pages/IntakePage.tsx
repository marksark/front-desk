import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Link,
  Stack,
  Typography
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const intakeTheme = createTheme({
  palette: { mode: "light" }
});
import validator from "@rjsf/validator-ajv8";
import FormWithWidgets from "../json-form-builder/forms/FormWithWidgets";

const API = "";

function getTenantFromQuery(): string | null {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("tenant");
  if (typeof t === "string" && t.trim().length > 0) {
    return t.trim();
  }
  return null;
}

export function IntakePage() {
  const tenantId = useMemo(() => getTenantFromQuery(), []);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jsonSchema, setJsonSchema] = useState<Record<string, unknown> | null>(null);
  const [uiSchema, setUiSchema] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState<string | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      setLoadError("Add a tenant to the URL, for example: /intake?tenant=sunshine-academy");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API}/api/form-template/${encodeURIComponent(tenantId)}`);
      if (res.status === 404) {
        setLoadError("No published form is available for this school yet.");
        setJsonSchema(null);
        setUiSchema(null);
        return;
      }
      if (!res.ok) {
        setLoadError("Could not load the form. Please try again later.");
        setJsonSchema(null);
        setUiSchema(null);
        return;
      }
      const data = (await res.json()) as {
        template: { jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown> };
      };
      setJsonSchema(data.template.jsonSchema);
      setUiSchema(data.template.uiSchema);
    } catch {
      setLoadError("Could not load the form. Please try again later.");
      setJsonSchema(null);
      setUiSchema(null);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async (formData: Record<string, unknown>) => {
    if (!tenantId || submitting) {
      return;
    }
    setSubmitting(true);
    setSubmitOk(null);
    setSubmitErr(null);
    try {
      const res = await fetch(`${API}/api/form-submissions/${encodeURIComponent(tenantId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData })
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 403) {
        setSubmitErr("Submissions are disabled on the hosted demo. Run the app locally to test.");
        return;
      }
      if (!res.ok) {
        setSubmitErr(
          typeof payload.error === "string" && payload.error.trim().length > 0
            ? payload.error
            : "Submission failed."
        );
        return;
      }
      setSubmitOk("Thank you — your response was submitted.");
    } catch {
      setSubmitErr("Could not submit. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!tenantId) {
    return (
      <ThemeProvider theme={intakeTheme}>
        <CssBaseline />
        <main className="intake-page">
          <Container maxWidth="sm" sx={{ py: 4 }}>
            <Alert severity="warning">
              Add <code>?tenant=…</code> to the address bar to open a school’s form.
            </Alert>
          </Container>
        </main>
      </ThemeProvider>
    );
  }

  if (isLoading) {
    return (
      <ThemeProvider theme={intakeTheme}>
        <CssBaseline />
        <main className="intake-page">
          <Container maxWidth="sm" sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress aria-label="Loading form" />
          </Container>
        </main>
      </ThemeProvider>
    );
  }

  if (loadError || !jsonSchema || !uiSchema) {
    return (
      <ThemeProvider theme={intakeTheme}>
        <CssBaseline />
        <main className="intake-page">
          <Container maxWidth="sm" sx={{ py: 4 }}>
            {loadError ? <Alert severity="error">{loadError}</Alert> : null}
          </Container>
        </main>
      </ThemeProvider>
    );
  }

  const title =
    typeof jsonSchema.title === "string" && jsonSchema.title.length > 0
      ? jsonSchema.title
      : "Intake form";

  return (
    <ThemeProvider theme={intakeTheme}>
      <CssBaseline />
      <main className="intake-page">
        <Container maxWidth="sm" sx={{ py: 3 }}>
          <Stack spacing={2}>
            <Typography variant="h4" component="h1">
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {tenantId ? (
                <>
                  You are filling the form for <strong>{tenantId}</strong>. Wrong school?{" "}
                  <Link href="/intake">Change link</Link>
                </>
              ) : null}
            </Typography>
            {submitOk ? <Alert severity="success">{submitOk}</Alert> : null}
            {submitErr ? <Alert severity="error">{submitErr}</Alert> : null}
            <Box sx={{ pt: 1 }}>
              <FormWithWidgets
                schema={jsonSchema}
                uiSchema={uiSchema}
                validator={validator}
                liveValidate
                onSubmit={({ formData }) => {
                  void onSubmit((formData ?? {}) as Record<string, unknown>);
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={submitting}
                  sx={{ mt: 2 }}
                >
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              </FormWithWidgets>
            </Box>
          </Stack>
        </Container>
      </main>
    </ThemeProvider>
  );
}
