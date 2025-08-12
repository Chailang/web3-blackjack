const { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');

// DynamoDB客户端配置
const dynamoDBClient = new DynamoDBClient({
  region: 'ap-southeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET || '',
  },
});

// 表名
const TABLE_NAME = 'blackjack';

// 玩家分数接口
export interface PlayerScore {
  player: string;
  score: number;
  lastUpdated?: string;
}

// 读取玩家分数
export async function getPlayerScore(player: string): Promise<PlayerScore | null> {
  try {
    const command = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        player: player,
      }),
    });

    const response = await dynamoDBClient.send(command);
    
    if (!response.Item) {
      return null; // 玩家不存在
    }

    const playerData = unmarshall(response.Item) as PlayerScore;
    return playerData;
  } catch (error) {
    console.error('读取玩家分数失败:', error);
    throw new Error(`读取玩家分数失败: ${error}`);
  }
}

// 写入玩家分数（如果玩家不存在则创建）
export async function putPlayerScore(player: string, score: number): Promise<void> {
  try {
    const playerData: PlayerScore = {
      player: player,
      score: score,
      lastUpdated: new Date().toISOString(),
    };

    const command = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall(playerData),
    });

    await dynamoDBClient.send(command);
    console.log(`玩家 ${player} 的分数已保存: ${score}`);
  } catch (error) {
    console.error('保存玩家分数失败:', error);
    throw new Error(`保存玩家分数失败: ${error}`);
  }
}

// 更新玩家分数（如果玩家存在则更新）
export async function updatePlayerScore(player: string, score: number): Promise<void> {
  try {
    const command = new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({
        player: player,
      }),
      UpdateExpression: 'SET score = :score, lastUpdated = :lastUpdated',
      ExpressionAttributeValues: marshall({
        ':score': score,
        ':lastUpdated': new Date().toISOString(),
      }),
    });

    await dynamoDBClient.send(command);
    console.log(`玩家 ${player} 的分数已更新: ${score}`);
  } catch (error) {
    console.error('更新玩家分数失败:', error);
    throw new Error(`更新玩家分数失败: ${error}`);
  }
}

// 获取或创建玩家分数（如果不存在则创建默认分数0）
export async function getOrCreatePlayerScore(player: string): Promise<PlayerScore> {
  try {
    let playerScore = await getPlayerScore(player);
    
    if (!playerScore) {
      // 玩家不存在，创建新记录
      await putPlayerScore(player, 0);
      playerScore = {
        player: player,
        score: 0,
        lastUpdated: new Date().toISOString(),
      };
    }
    
    return playerScore;
  } catch (error) {
    console.error('获取或创建玩家分数失败:', error);
    throw new Error(`获取或创建玩家分数失败: ${error}`);
  }
}

// 增加玩家分数（用于游戏胜利时）
export async function addPlayerScore(player: string, points: number): Promise<PlayerScore> {
  try {
    const currentScore = await getOrCreatePlayerScore(player);
    const newScore = currentScore.score + points;
    
    await updatePlayerScore(player, newScore);
    
    return {
      player: player,
      score: newScore,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('增加玩家分数失败:', error);
    throw new Error(`增加玩家分数失败: ${error}`);
  }
}

// 减少玩家分数（用于游戏失败时）
export async function subtractPlayerScore(player: string, points: number): Promise<PlayerScore> {
  try {
    const currentScore = await getOrCreatePlayerScore(player);
    const newScore = Math.max(0, currentScore.score - points); // 确保分数不会小于0
    
    await updatePlayerScore(player, newScore);
    
    return {
      player: player,
      score: newScore,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('减少玩家分数失败:', error);
    throw new Error(`减少玩家分数失败: ${error}`);
  }
} 