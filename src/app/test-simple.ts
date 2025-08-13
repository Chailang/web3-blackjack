'use strict';

// 定义事件类型
interface APIGatewayEvent {
  requestContext?: {
    http?: {
      method?: string;
    };
  };
  httpMethod?: string;
  queryStringParameters?: Record<string, string>;
  pathParameters?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
}

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler = async (event: APIGatewayEvent) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  try {
    const method = event?.requestContext?.http?.method || event?.httpMethod || 'GET';
    console.log('HTTP Method:', method);

    // 处理 CORS 预检
    if (method === 'OPTIONS') {
      return { 
        statusCode: 204, 
        headers: corsHeaders, 
        body: '' 
      };
    }

    if (method !== 'GET') {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Method Not Allowed' }),
      };
    }

    const player = extractPlayer(event);
    console.log('Extracted player:', player);
    
    if (!player) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          message: "缺少必须的参数 'player'（可从 query/path/body 传入）",
          receivedEvent: event,
          help: "请使用 ?player=0xbc4b0Fc8eB6c564488c6Cb8859c09e37f839E441"
        }),
      };
    }

    // 模拟DynamoDB查询结果
    const mockResult = {
      player: player,
      score: Math.floor(Math.random() * 1000),
      lastUpdated: new Date().toISOString(),
      message: "这是模拟数据，实际部署时需要连接DynamoDB"
    };

    console.log('Returning mock result:', JSON.stringify(mockResult, null, 2));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(mockResult),
    };
    
  } catch (err) {
    console.error('Error in handler:', err);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        message: 'Internal Server Error',
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
    };
  }
};

// 从常见位置提取 player：优先 query，其次 path，最后 body（便于本地测试）
function extractPlayer(event: APIGatewayEvent): string | undefined {
  try {
    // 1) 优先从 Query 参数取（Postman 用 Params 或 URL ?player=xxx）
    const qs = event?.queryStringParameters;
    if (qs && (qs.player ?? qs.Player ?? qs.PLAYER)) {
      return qs.player || qs.Player || qs.PLAYER;
    }

    // 2) API Gateway 路径参数（如 /blackjack/{player}）
    const pp = event?.pathParameters;
    if (pp && (pp.player ?? pp.Player)) {
      return decodeURIComponent(pp.player || pp.Player);
    }

    // 3) 兜底：从 Header 读（建议使用 x-player）
    if (event?.headers) {
      const headers = Object.fromEntries(
        Object.entries(event.headers).map(([k, v]) => [k.toLowerCase(), v])
      );
      if (headers['x-player']) return headers['x-player'];
      if (headers['player']) return headers['player'];
    }

    // 4) 最后兜底：从 body 读（一般 GET 不用）
    if (event?.body) {
      try {
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        if (body?.player) return body.player;
      } catch (parseError) {
        console.error('Error parsing body:', parseError);
      }
    }

    return undefined;
  } catch (error) {
    console.error('Error extracting player:', error);
    return undefined;
  }
} 