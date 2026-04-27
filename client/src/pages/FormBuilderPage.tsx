import { useCallback, useEffect, useState } from "react";
import { Box, CircularProgress, Container, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import FormBuilderApp from "../json-form-builder/components/FormBuilderApp.jsx";
import {
  resetFormBuilderState,
  setJSONSchema,
  setUISchema
} from "../json-form-builder/store/slice.js";
import { useTenant } from "../tenant/TenantContext";

export function FormBuilderPage() {
  const { tenantId } = useTenant();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSavedTemplate, setHasSavedTemplate] = useState(false);

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/form-template/${encodeURIComponent(tenantId)}`);
      if (response.ok) {
        const data = (await response.json()) as {
          template: { jsonSchema: Record<string, unknown>; uiSchema: Record<string, unknown> };
        };
        dispatch(setJSONSchema(data.template.jsonSchema));
        dispatch(setUISchema(data.template.uiSchema));
        setHasSavedTemplate(true);
      } else if (response.status === 404) {
        dispatch(resetFormBuilderState());
        setHasSavedTemplate(false);
      } else {
        dispatch(resetFormBuilderState());
        setHasSavedTemplate(false);
      }
    } catch {
      dispatch(resetFormBuilderState());
      setHasSavedTemplate(false);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, dispatch]);

  useEffect(() => {
    void loadTemplate();
  }, [loadTemplate]);

  if (isLoading) {
    return (
      <Container maxWidth="xl">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "50vh"
          }}
        >
          <CircularProgress aria-label="Loading form template" />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Intake Form Builder
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom>
          Drag and drop form builder
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Building for: <strong>{tenantId}</strong>
        </Typography>
        <FormBuilderApp
          formTemplate={null}
          tenantId={tenantId}
          hasSavedTemplate={hasSavedTemplate}
        />
      </Box>
    </Container>
  );
}
