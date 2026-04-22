import { Box, Container, Typography } from "@mui/material";
import FormBuilderApp from "../json-form-builder/components/FormBuilderApp.jsx";
import { useTenant } from "../tenant/TenantContext";

export function FormBuilderPage() {
  const { tenantId } = useTenant();

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          JSON Form Builder
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom>
          Drag and drop form builder
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
          Building for: <strong>{tenantId}</strong>
        </Typography>
        <FormBuilderApp formTemplate={null} tenantId={tenantId} />
      </Box>
    </Container>
  );
}
