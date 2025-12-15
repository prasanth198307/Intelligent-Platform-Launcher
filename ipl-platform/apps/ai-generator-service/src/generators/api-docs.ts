export interface APIDocsContext {
  domain: string;
  projectName?: string;
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
      primary?: boolean;
      foreignKey?: string;
    }>;
  }>;
  baseUrl?: string;
}

function mapColumnTypeToSwagger(type: string): { type: string; format?: string } {
  const typeMap: Record<string, { type: string; format?: string }> = {
    'INTEGER': { type: 'integer', format: 'int32' },
    'BIGINT': { type: 'integer', format: 'int64' },
    'SERIAL': { type: 'integer', format: 'int32' },
    'VARCHAR': { type: 'string' },
    'TEXT': { type: 'string' },
    'BOOLEAN': { type: 'boolean' },
    'TIMESTAMP': { type: 'string', format: 'date-time' },
    'DATE': { type: 'string', format: 'date' },
    'DECIMAL': { type: 'number', format: 'double' },
    'FLOAT': { type: 'number', format: 'float' },
    'JSON': { type: 'object' },
    'JSONB': { type: 'object' },
    'UUID': { type: 'string', format: 'uuid' },
  };
  return typeMap[type.toUpperCase()] || { type: 'string' };
}

export function generateOpenAPISpec(ctx: APIDocsContext): string {
  const project = ctx.projectName || ctx.domain + '-platform';
  const baseUrl = ctx.baseUrl || 'https://api.' + project + '.example.com';
  
  const schemas: Record<string, any> = {};
  const paths: Record<string, any> = {};
  
  for (const table of ctx.tables) {
    const entityName = table.name.charAt(0).toUpperCase() + table.name.slice(1);
    const properties: Record<string, any> = {};
    
    for (const col of table.columns) {
      properties[col.name] = {
        ...mapColumnTypeToSwagger(col.type),
        description: col.primary ? 'Unique identifier' : undefined,
        readOnly: col.primary ? true : undefined,
      };
      if (col.primary || col.name === 'created_at') {
        properties[col.name].readOnly = true;
      }
    }
    
    schemas[entityName] = {
      type: 'object',
      properties,
      required: table.columns.filter(c => c.primary).map(c => c.name),
    };
    
    schemas[entityName + 'Create'] = {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(properties).filter(([key]) => 
          !['id', 'created_at', 'updated_at'].includes(key)
        )
      ),
    };
    
    schemas[entityName + 'Update'] = {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(properties).filter(([key]) => 
          !['id', 'created_at', 'updated_at'].includes(key)
        )
      ),
    };
    
    const basePath = '/api/' + table.name;
    
    paths[basePath] = {
      get: {
        summary: 'List all ' + table.name,
        operationId: 'list' + entityName,
        tags: [entityName],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'sort', in: 'query', schema: { type: 'string' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/' + entityName } },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total: { type: 'integer' },
                        totalPages: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
        security: [{ bearerAuth: [] }],
      },
      post: {
        summary: 'Create a new ' + table.name.slice(0, -1),
        operationId: 'create' + entityName,
        tags: [entityName],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/' + entityName + 'Create' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/' + entityName },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
        security: [{ bearerAuth: [] }],
      },
    };
    
    paths[basePath + '/{id}'] = {
      get: {
        summary: 'Get a ' + table.name.slice(0, -1) + ' by ID',
        operationId: 'get' + entityName,
        tags: [entityName],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/' + entityName },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
        security: [{ bearerAuth: [] }],
      },
      put: {
        summary: 'Update a ' + table.name.slice(0, -1),
        operationId: 'update' + entityName,
        tags: [entityName],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/' + entityName + 'Update' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/' + entityName },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
        security: [{ bearerAuth: [] }],
      },
      delete: {
        summary: 'Delete a ' + table.name.slice(0, -1),
        operationId: 'delete' + entityName,
        tags: [entityName],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'Deleted successfully' },
          '404': { $ref: '#/components/responses/NotFound' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
        security: [{ bearerAuth: [] }],
      },
    };
  }
  
  const spec = {
    openapi: '3.0.3',
    info: {
      title: project + ' API',
      description: 'REST API for ' + project + ' - Generated by Intelligent Platform Launcher',
      version: '1.0.0',
      contact: { email: 'api@example.com' },
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
    },
    servers: [
      { url: baseUrl, description: 'Production' },
      { url: baseUrl.replace('api.', 'api-staging.'), description: 'Staging' },
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    tags: ctx.tables.map(t => ({
      name: t.name.charAt(0).toUpperCase() + t.name.slice(1),
      description: 'Operations for ' + t.name,
    })),
    paths,
    components: {
      schemas,
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      responses: {
        BadRequest: {
          description: 'Bad request',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  details: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { error: { type: 'string', example: 'Unauthorized' } },
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { error: { type: 'string', example: 'Resource not found' } },
              },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  requestId: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  };
  
  return JSON.stringify(spec, null, 2);
}
