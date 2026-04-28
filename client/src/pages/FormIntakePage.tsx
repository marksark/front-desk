import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, CircularProgress, Container, Link, Paper, Typography } from "@mui/material";
import Form from "@rjsf/mui";
import validator from "@rjsf/validator-ajv8";
import { useTenant } from "../tenant/TenantContext";

function getTenantFromQuery(): string | null {
  try {
    const q = new URLSearchParams(window.location.search).get("tenant");
    return q && q.trim().length > 0 ? q.trim() : null;
  } catch {
    return null;
  }
}

export function FormIntakePage() {
  const { tenantId: contextTenantId } = useTenant();
  const tenantId = useMemo(
    () => getTenantFromQuery() ?? contextTenantId,
    [contextTenantId]
  );

  const [jsonSchema, setJsonSchema] = useState<Record<string, unknown> | null>(null);
  const [uiSchema, setUiSchema] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch(
        `/api/form-template/${encodeURIComponent(tenantId)}`
      );
      if (response.status === 404) {
        setJsonSchema(null);
        setUiSchema({});
        return;
      }
      if (!response.ok) {
        setLoadError("Could not load the intake form. Please try again later.");
        setJsonSchema(null);
        return;
      }
      const data = (await response.json()) as {
        template: { jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown> };
      };
      setJsonSchema(data.template.jsonSchema);
      setUiSchema(data.template.uiSchema);
    } catch {
      setLoadError("Could not load the intake form. Please try again later.");
      setJsonSchema(null);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  const handleSubmit = async (result: { formData?: Record<string, unknown> }) => {
    setSubmitError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/form-submissions/${encodeURIComponent(tenantId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: result.formData ?? {} })
        }
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setSubmitError(
          typeof payload.error === "string" && payload.error.trim()
            ? payload.error
            : "Submission failed. Please try again."
        );
        return;
      }
      setSuccessMessage("Thank you — your response has been submitted.");
      setFormKey((k) => k + 1);
    } catch {
      setSubmitError("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "40vh"
          }}
        >
          <CircularProgress aria-label="Loading intake form" />
        </Box>
      </Container>
    );
  }

  if (loadError) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{loadError}</Alert>
        <Box sx={{ mt: 2 }}>
          <Link href="/">Back to home</Link>
        </Box>
      </Container>
    );
  }

  if (jsonSchema === null) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Intake form
        </Typography>
        <Alert severity="info">
          There is no published intake form for this school yet. Please check back later.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Link href="/">Back to home</Link>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {typeof jsonSchema.title === "string" ? jsonSchema.title : "Intake form"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {getTenantFromQuery() ? (
          <>Submitting to: {tenantId}</>
        ) : (
          <>If you were given a school link, use it so your answers go to the right place.</>
        )}
      </Typography>
      {successMessage ? (
        <Alert severity="success" sx={{ mb: 2 }} role="status">
          {successMessage}
        </Alert>
      ) : null}
      {submitError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      ) : null}
      <Paper sx={{ p: 2 }}>
        <Form
          key={formKey}
          schema={jsonSchema}
          uiSchema={uiSchema}
          validator={validator}
          disabled={isSubmitting}
          onSubmit={handleSubmit}
        />
      </Paper>
      <Box sx={{ mt: 2 }}>
        <Link href="/">Back to home</Link>
      </Box>
    </Container>
  );
}
