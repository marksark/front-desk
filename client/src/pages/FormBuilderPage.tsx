import { Box, Container, Typography } from "@mui/material";
import FormBuilderApp from "../json-form-builder/components/FormBuilderApp.jsx";

export function FormBuilderPage() {
  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          JSON Form Builder
        </Typography>
        <Typography variant="h6" component="h2" gutterBottom sx={{ mb: 4 }}>
          Drag and drop form builder
        </Typography>
        <FormBuilderApp formTemplate={null} />
      </Box>
    </Container>
  );
}
