"use client"
import { use, useEffect, useState } from "react"
import { Card } from "@/app/api/route"
// import { Card } from "./api/route"
// import { Card } from "./api/route.ts";

export default function Page() {

  const [message, setMessage] = useState<string>("")
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [score, setScore] = useState<number>(0)


  //在组件里声明一个叫 deck 的状态变量，初始值是 initialDeck，并提供一个叫 setDeck 的函数，用来修改它。
  useEffect(() => {
      setMessage("")
      const initialGame = async () => {
      try {
        const response = await fetch("/api", {
          method: "GET",
        });
        if (!response.ok) {
          console.error("API 请求失败：", response.status, response.statusText);
          return;
        }
        const result = await response.json();
        console.log("API 响应：", result); // 打印响应数据
        setPlayerHand(result.playerHand || []);
        setDealerHand(result.dealerHand || []);
        setScore(result.score || 0);
      } catch (error) {
        console.error("初始化游戏失败：", error);
        setMessage("无法加载游戏，请重试。");
      }
    };
      initialGame()
  }, []);


  async function handleHit() {
    const response = await fetch("/api", {
      method: "POST",
      body: JSON.stringify({action: "hit"})
    })
    const { playerHand, dealerHand, message, score } = await response.json()
    setPlayerHand(playerHand)
    setDealerHand(dealerHand)
    setMessage(message)
    setScore(score)

  }

  async function handleStand() {
    const response = await fetch("/api", {
      method: "POST",
      body: JSON.stringify({action: "stand"})
    })
    const { playerHand, dealerHand, message, score } = await response.json()
    setPlayerHand(playerHand)
    setDealerHand(dealerHand)
    setMessage(message)
    setScore(score)
  }

  async function handleReset() {
    const response = await fetch("/api", {
      method: "GET",
    })

    const { playerHand, dealerHand, message, score } = await response.json()
    setPlayerHand(playerHand)
    setDealerHand(dealerHand)
    setMessage(message)
    setScore(score)
  }
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-screen p-4 bg-green-100">
      <h1 className="text-3xl font-bold">Welcome to the 21 点游戏  App</h1>
      <h1 className="my-4 text-4xl bold">Score: {score}</h1>
      <h2 className={`text-2xl font-bold ${message.includes("win") ? "bg-yellow-100" : "bg-green-100"}`}>{message}</h2>
      {/* 庄家 */}
      <div>
        <h2 className="text-2xl font-bold mb-2 items-center">庄家</h2>
        <div className="flex flex-row gap-2">
          { dealerHand.length === 0 ? <>暂无手牌</> :dealerHand.map((card, index) => (
            <div key={index} className="w-32 h-48 border border-black bg-green-200 rounded-md flex flex-col justify-between">
              <p className="self-start p-2 text-lg">{card.rank} </p>
              <p className="self-center p-2.5 text-3xl">{card.suit} </p>
              <p className="self-end p-2 text-lg">{card.rank} </p>
            </div>
          ))}
        </div>
      </div>

     {/* 玩家 */}
      <div>
        <h2 className="text-2xl font-bold mb-2">玩家</h2>
        <div className="flex flex-row gap-2 mt-2">
           {playerHand.length === 0 ? <></> : playerHand.map((card, index) => (
            <div key={index} className="w-32 h-48 border border-black bg-yellow-100 rounded-md flex flex-col justify-between">
              <p className="self-start p-2 text-lg">{card.rank} </p>
              <p className="self-center p-2.5 text-3xl">{card.suit} </p>
              <p className="self-end p-2 text-lg">{card.rank} </p>
            </div>
          ))}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex flex-row gap-2 mt-4">{
          message !== "" ? <button onClick={handleReset} className="p-1 bg-amber-300 rounded-lg"> reset </button> :
           <>
            <button onClick={handleHit} className="p-2 bg-amber-300 rounded-lg font-bold">Hit</button>
            <button onClick={handleStand} className="p-2 bg-amber-300 rounded-lg font-bold">Stand</button>
          </>
        }
        
      </div>
    </div>
  );
}
