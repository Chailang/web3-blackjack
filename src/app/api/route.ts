
import { PlayerScore,getPlayerScore, putPlayerScore, updatePlayerScore } from '../dynamodb';
import { verifyMessage } from "viem";

const suits = ['♠️', '♥️', '♦️', '♣️']
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
const initialDeck = suits.map(suit => ranks.map(rank => ({suit: suit, rank: rank}))).flat()
const defaultPlayer = "defaultPlayer"
export interface Card {
  suit: string;
  rank: string;
}

//gameState: {...}显式指定了 gameState 对象的类型结构
const gameState: {
    dealerHand: Card[], //庄家手中的牌
    playerHand: Card[], //玩家手中的牌，
    deck: Card[], //牌堆，包含所有剩余的牌
    message: string, //游戏中的消息或提示，类型为字符串。
    score: number //游戏分数
} = {
    dealerHand: [],
    playerHand: [],
    deck: initialDeck,
    message: "",
    score: 0
}
// 更清晰的写法
// export interface GameState {
//   dealerHand: Card[];
//   playerHand: Card[];
//   deck: Card[];
//   message: string;
//   score: number;
// }

// const gameState: GameState = {
//   dealerHand: [],
//   playerHand: [],
//   deck: initialDeck,
//   message: "",
//   score: 0,
// };

// 获取随机牌的函数
// 这个函数从牌堆中随机抽取指定数量的牌，并返回抽取的牌和剩余的牌堆。
// 它使用 Set 来确保抽取的牌的索引是唯一的，避免重复抽取同一张牌。
// deck 剩余的牌
// noOfCards 要抽取的牌的数量
// 返回值是一个元组，第一个元素是抽取的牌，第二个元素是更新后的牌堆。
function getRandomCard(deck: Card[], noOfCards: number): [Card[], Card[]] {
    const randomeIndexSet = new Set<number>()
    while(randomeIndexSet.size < noOfCards) {
        const randomIndex = Math.floor(Math.random() * deck.length)
        randomeIndexSet.add(randomIndex)
    }

    const randomCards = deck.filter((_, index) => randomeIndexSet.has(index))
    const newDeck = deck.filter((_, index) => !randomeIndexSet.has(index))
    return [randomCards, newDeck]
}

export async function GET() {
    gameState.deck = [...initialDeck] 
    gameState.dealerHand = []
    gameState.playerHand = []
    gameState.message = ""
    ///庄家-玩家 各2张牌
    const [dealerHand, deckAfterDealer] = getRandomCard(gameState.deck,2)
    const [playerHand, deckAfterPlayer] = getRandomCard(deckAfterDealer,2)
    gameState.dealerHand = dealerHand
    gameState.playerHand = playerHand
    gameState.deck = deckAfterPlayer //当前剩余的牌

    try {
        const response = await getPlayerScore(defaultPlayer)
        console.log("response", response)
        if(!response) {
            gameState.score = 0
        } else {
            gameState.score = response.score
        }
    } catch (error) {
        console.error("获取玩家分数失败:", error)
        gameState.score = 0
    }

    return new Response(JSON.stringify({
        playerHand: gameState.playerHand,
        dealerHand: [gameState.dealerHand[0], {suit: "?", rank: "?"}], //只显示庄家的第一张牌
        deck: gameState.deck,
        message: gameState.message,
        score: gameState.score
    }),{
        status: 200
    })

}

//计算手牌的值
function calculateHandValue(hand: Card[]): number {
    let value = 0
    let acesCount = 0
    hand.forEach(card => {
        //card.rank === "A"：如果牌的点数是 "A"，将 acesCount 增加 1。
        //value += 11：默认将 A 计为 11 点（二十一点中 A 可以是 1 或 11，初始假设为 11）。
        if(card.rank === "A") {
            acesCount++
            value += 11
        }
        else if(card.rank === "J" || card.rank === "Q" || card.rank === "K") {
            value += 10
        }
        else {
             value += parseInt(card.rank)
        }
    })
    //在二十一点中，如果手牌总点数超过 21（爆牌，Bust），且有 A（Ace），可以将 A 从 11 点调整为 1 点（相当于减去 10 点），以尽量避免爆牌。
    while(value > 21 && acesCount > 0) {
        value -= 10
        acesCount--
    }
    return value
}
/**
 * 二十一点规则背景
为了更好理解代码，简单回顾二十一点的点数规则：
数字牌（2-10）：点数等于牌面值（例如，5 计为 5 点）。
面牌（J、Q、K）：计为 10 点。
A（Ace）：可计为 1 点或 11 点，具体取决于手牌总点数是否会导致爆牌（>21）。
目标：手牌点数尽量接近 21 而不超过，超过 21 则爆牌。
 * 
*/

// handle the hit and stand and decide who is the winner
//// POST 请求处理函数
// 这个函数处理玩家的操作（hit 或 stand），更新游戏状态，并返回当前的游戏状态。
// 它首先检查游戏是否已经结束，如果是，则返回当前状态。
// 如果操作无效（既不是 hit 也不是 stand），则返回错误信息。
// 如果操作是 hit，则从牌堆中抽取一张牌，更新玩家的手牌，并检查是否爆牌或获得黑杰克（21 点）。
// 如果操作是 stand，则庄家继续抽牌直到点数达到 17 或更高，然后比较庄家和玩家的手牌点数，决定胜负，并更新游戏状态。
// 返回值是一个 JSON 响应，包含玩家手牌、庄家手牌（如果游戏结束则显示全部，否则只显示一张）、消息和分数。
// 注意：这个函数假设请求体是 JSON 格式，并且包含一个 action 字段，表示玩家的操作（hit 或 stand）。

// hit：玩家要一张新牌，添加到 playerHand，可能导致爆牌（>21）或二十一点（=21）。
// stand：玩家停止要牌，轮到庄家抽牌，庄家必须抽到至少 17 点。
// 胜负规则：
// 玩家点数 = 21：玩家赢（Blackjack）。
// 玩家点数 > 21：玩家输（爆牌）。
// 玩家停牌后：
// 庄家点数 > 21：玩家赢（庄家爆牌）。
// 庄家点数 = 21：庄家赢（Blackjack）。
// 庄家点数 <= 21：比较双方点数，点数高者赢，相等则平局。




// 分数：赢加 100 分，输减 100 分，平局不变。
export async function POST(request: Request) {
    try {
        // return if the current game is finished
        if(gameState.message !== "") {
            return new Response(JSON.stringify({
                playerHand: gameState.playerHand,
                dealerHand: gameState.dealerHand,
                message: gameState.message    
            }), {
                status: 200
            })
        } 

        // return if the action is not hit or stand
        const body = await request.json()
        const { action, player } = body
        
        // verify if the signature is correct
        if(action === "auth") {
            console.log("Auth action received:", body)
            const { signature, message } = body
            try {
                console.log("Verifying signature for address:", player)
                const isValid = await verifyMessage({
                    address: player,
                    signature,
                    message
                })
                if(isValid) {
                    console.log("Signature is valid for player:", player)
                    return new Response(JSON.stringify({"token": "valid_signature"}), {
                        status: 200
                    })
                } else {
                    return new Response(JSON.stringify({message: "Signature is invalid"}), {
                        status: 400
                    })
                }
            } catch (error) {
                console.error("Signature verification error:", error)
                return new Response(JSON.stringify({message: "Signature verification failed"}), {
                    status: 400
                })
            }
        }
        
        if(action !== "hit" && action !== "stand") {
            return new Response(JSON.stringify({message: "Invalid action"}), {
                status: 400
            })
        }

        // hit: 21 - player wins black jack
        // hit: greater than 21 - player loses, bust
        // hit: less than 21 = continue, update the player hand

        
        if(action === "hit") {
            
            const [newCard, newDeck] = getRandomCard(gameState.deck, 1)
            gameState.playerHand.push(...newCard)
            gameState.deck = newDeck

            const playerValue = calculateHandValue(gameState.playerHand)
            if(playerValue > 21) {
                gameState.message = "你输了! 爆点了!"
                gameState.score -= 100
            }
            else if(playerValue === 21) {
                gameState.message = "你赢了! 庄家爆点了!"
                gameState.score += 100
            }
        }

        else if(action === "stand") {
            let dealerValue = calculateHandValue(gameState.dealerHand)
            while(dealerValue < 17) {
                const [newCard, newDeck] = getRandomCard(gameState.deck, 1)
                gameState.dealerHand.push(...newCard)
                gameState.deck = newDeck
                dealerValue = calculateHandValue(gameState.dealerHand)
            }

            const playerValue = calculateHandValue(gameState.playerHand)
            // stand: 21 - dealer wins, black jack
            // stand: greate than 21 - player win, dealer bust
            // stand: less than 21 - 
                // dealer hand > player hand: dealer wins
                // dealer hand < player hand: player wins
                // dealer hand = player hand : draw 

            if(dealerValue > 21) {
                gameState.message = "You win! Dealer busts!"
                gameState.score += 100
            } else if(dealerValue === 21) {
                gameState.message = "You lose! Black Jack!"
                gameState.score -= 100
            } else {
                if(dealerValue > playerValue) {
                    gameState.message = "You lose"
                    gameState.score -= 100
                } else if(dealerValue < playerValue) {
                    gameState.message = "You win"
                    gameState.score += 100
                } else {
                    gameState.message = "Draw!"
                }
            }
        }

        try {
            await updatePlayerScore(defaultPlayer, gameState.score)
        } catch (error) {
            console.error("更新玩家分数失败:", error)
            // 继续执行，不中断游戏流程
        }

        return new Response(JSON.stringify(
            {
                playerHand: gameState.playerHand,
                dealerHand: gameState.message !== "" ? gameState.dealerHand : [gameState.dealerHand[0], {suit: "?", rank: "?"} as Card],
                message: gameState.message,
                score: gameState.score
            }), {
            status: 200
        })
    } catch (error) {
        console.error("Error parsing request body:", error)
        return new Response(JSON.stringify({message: "Invalid request"}), {
            status: 400
        })
    }
}