/* global SwaggerUIBundle */

// Shows the API spec next to this page, with a "Try it out" button that calls this site.
window.addEventListener('DOMContentLoaded', () => {
  SwaggerUIBundle({ url: 'openapi.yaml', dom_id: '#swagger-ui' });
});
