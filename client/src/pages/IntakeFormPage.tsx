import { useCallback, useEffect, useState } from "react";
import { Box, Button, Container, TextField, Typography } from "@mui/material";
import validator from "@rjsf/validator-ajv8";
import FormWithWidgets from "../json-form-builder/forms/FormWithWidgets";
import { FormBuilderProviders } from "../form-builder/FormBuilderProviders";
import { useTenant } from "../tenant/TenantContext";

type TemplateResponse = {
  template: { jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown> };
};

function getTenantFromQuery(): string | null {
  try {
    const param = new URLSearchParams(window.location.search).get("tenant");
    const t = param?.trim();
    return t && t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

function IntakeFormInner() {
  const { tenantId: contextTenant } = useTenant();
  const queryTenant = getTenantFromQuery();
  const tenantId = queryTenant ?? contextTenant;

  const [jsonSchema, setJsonSchema] = useState<Record<string, unknown> | null>(null);
  const [uiSchema, setUiSchema] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/form-template/${encodeURIComponent(tenantId)}`);
      if (res.status === 404) {
        setLoadError("This school has not published an intake form yet.");
        setJsonSchema(null);
        setUiSchema(null);
        return;
      }
      if (!res.ok) {
        setLoadError("Could not load the intake form. Please try again later.");
        return;
      }
      const data = (await res.json()) as TemplateResponse;
      setJsonSchema(data.template.jsonSchema);
      setUiSchema(data.template.uiSchema);
    } catch {
      setLoadError("Could not load the intake form. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  const handleRjsfSubmit = async (e: { formData?: Record<string, unknown> }) => {
    setSubmitError(null);
    setIsSubmitting(true);
    const formData = e.formData && typeof e.formData === "object" ? e.formData : {};
    try {
      const res = await fetch(`/api/form-submissions/${encodeURIComponent(tenantId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          submitterName: submitterName.trim() || undefined,
          submitterEmail: submitterEmail.trim() || undefined
        })
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSubmitError(
          typeof payload.error === "string" && payload.error
            ? payload.error
            : "Submission failed. Please check the form and try again."
        );
        return;
      }
      setIsSuccess(true);
    } catch {
      setSubmitError("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography>Loading form…</Typography>
      </Container>
    );
  }

  if (loadError) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography color="error" role="alert">
          {loadError}
        </Typography>
      </Container>
    );
  }

  if (isSuccess) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }} data-testid="intake-success">
        <Typography variant="h1" component="h1" sx={{ fontSize: "1.5rem", mb: 2 }}>
          Thank you
        </Typography>
        <Typography>Your information was submitted. The school will follow up if needed.</Typography>
      </Container>
    );
  }

  if (!jsonSchema || !uiSchema) {
    return null;
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h1" component="h1" sx={{ fontSize: "1.35rem", fontWeight: 600, mb: 2 }}>
        {typeof jsonSchema.title === "string" ? jsonSchema.title : "Intake form"}
      </Typography>
      {queryTenant ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Responding for: {tenantId}
        </Typography>
      ) : null}
      {typeof jsonSchema.description === "string" && jsonSchema.description ? (
        <Box
          sx={{ mb: 2, color: "text.secondary", "& p": { margin: 0 } }}
          dangerouslySetInnerHTML={{ __html: jsonSchema.description }}
        />
      ) : null}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }} aria-label="Intake form">
        <TextField
          label="Your name (optional)"
          value={submitterName}
          onChange={(ev) => setSubmitterName(ev.target.value)}
          fullWidth
          autoComplete="name"
        />
        <TextField
          label="Your email (optional)"
          type="email"
          value={submitterEmail}
          onChange={(ev) => setSubmitterEmail(ev.target.value)}
          fullWidth
          autoComplete="email"
        />
        {submitError ? (
          <Typography color="error" role="alert" variant="body2">
            {submitError}
          </Typography>
        ) : null}
        <FormWithWidgets
          schema={jsonSchema}
          uiSchema={uiSchema}
          formData={{}}
          validator={validator}
          liveValidate
          onSubmit={handleRjsfSubmit}
        >
          <Button type="submit" variant="contained" color="primary" disabled={isSubmitting} fullWidth>
            {isSubmitting ? "Submitting…" : "Submit"}
          </Button>
        </FormWithWidgets>
      </Box>
    </Container>
  );
}

export function IntakeFormPage() {
  return (
    <FormBuilderProviders>
      <IntakeFormInner />
    </FormBuilderProviders>
  );
}
