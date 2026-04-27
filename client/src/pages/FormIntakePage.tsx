import { useCallback, useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Container, Snackbar, Typography } from "@mui/material";
import validator from "@rjsf/validator-ajv8";
import FormWithWidgets from "../json-form-builder/forms/FormWithWidgets";
import { FormBuilderProviders } from "../form-builder/FormBuilderProviders";

interface FormIntakeContentProps {
  tenantId: string;
}

function FormIntakeContent({ tenantId }: FormIntakeContentProps) {
  const [jsonSchema, setJsonSchema] = useState<Record<string, unknown> | null>(null);
  const [uiSchema, setUiSchema] = useState<Record<string, unknown>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackMessage, setSnackMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setJsonSchema(null);
    setSubmitted(false);
    try {
      const response = await fetch(
        `/api/form-template/${encodeURIComponent(tenantId)}`
      );
      if (response.status === 404) {
        setLoadError("No intake form is published for this school yet.");
        return;
      }
      if (!response.ok) {
        setLoadError("We could not load the form. Please try again later.");
        return;
      }
      const data = (await response.json()) as {
        template: { jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown> };
      };
      setJsonSchema(data.template.jsonSchema);
      setUiSchema({
        ...data.template.uiSchema,
        "ui:submitButtonOptions": { submitText: "Submit form" }
      });
    } catch {
      setLoadError("We could not load the form. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  const handleRjsfSubmit = async (payload: { formData?: Record<string, unknown> }) => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/form-submissions/${encodeURIComponent(tenantId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: payload.formData ?? {} })
      });
      if (response.status === 403) {
        setSnackMessage("Form submission is not available in the hosted demo. Run the app locally to test.");
        return;
      }
      if (!response.ok) {
        setSnackMessage("We could not submit the form. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setSnackMessage("We could not submit the form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "40vh"
        }}
      >
        <CircularProgress aria-label="Loading form" />
      </Box>
    );
  }

  if (loadError) {
    return <Alert severity="info">{loadError}</Alert>;
  }

  if (!jsonSchema) {
    return <Alert severity="info">No form is available.</Alert>;
  }

  if (submitted) {
    return (
      <Alert severity="success">
        Thank you! Your form was submitted successfully.
      </Alert>
    );
  }

  return (
    <>
      <FormWithWidgets
        schema={jsonSchema}
        uiSchema={uiSchema}
        formData={{}}
        validator={validator}
        liveValidate
        readonly={isSubmitting}
        onSubmit={(data) => void handleRjsfSubmit(data as { formData?: Record<string, unknown> })}
      />
      <Snackbar
        open={Boolean(snackMessage)}
        autoHideDuration={6000}
        onClose={() => setSnackMessage(null)}
        message={snackMessage}
      />
    </>
  );
}

export interface FormIntakePageProps {
  tenantId: string;
  title: string;
}

export function FormIntakePage({ tenantId, title }: FormIntakePageProps) {
  return (
    <FormBuilderProviders>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {tenantId}
        </Typography>
        <FormIntakeContent tenantId={tenantId} />
      </Container>
    </FormBuilderProviders>
  );
}
