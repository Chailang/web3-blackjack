"use client"
import { use, useEffect, useState } from "react"
import { Card } from "@/app/api/route"
import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { useAccount,useSignMessage } from 'wagmi';
import { parseAbi,createWalletClient, createPublicClient,custom} from "viem";
import { sepolia } from "viem/chains";

export default function Page() {

  const [message, setMessage] = useState<string>("")
  const [playerHand, setPlayerHand] = useState<Card[]>([])
  const [dealerHand, setDealerHand] = useState<Card[]>([])
  const [score, setScore] = useState<number>(0)
  const [signedIn, setSignedIn] = useState<boolean>(false) //是否已签名
  const { isConnected, address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [publicClient, setPublicClient] = useState<any>(null);
  const [walletClient, setWalletClient] = useState<any>(null);
  //在组件里声明一个叫 deck 的状态变量，初始值是 initialDeck，并提供一个叫 setDeck 的函数，用来修改它。
  useEffect(() => {

    /**
     * typeof window !== "undefined" → 确保代码在浏览器环境中执行（不是 Node.js 服务器端）。
     * window.ethereum → MetaMask（或其他 EIP-1193 钱包扩展）会在浏览器注入的对象，如果存在说明用户安装了钱包。
    * createWalletClient & createPublicClient → viem 提供的函数，用于创建与区块链交互的客户端实例。
    * wallet client → 用来发交易（签名、调用合约写入函数）
    * public client → 用来读链上数据（调用 view/pure 函数、获取区块等）
    */
    if (typeof window !== "undefined" && window.ethereum) {
      const wallet = createWalletClient({
        chain: sepolia,
        transport: custom(window.ethereum)
      })
      const publicC = createPublicClient({
        chain: sepolia,
        transport: custom(window.ethereum)
      })
      setWalletClient(() => wallet)
      setPublicClient(() => publicC)
    } else {
      console.error("MetaMask or window.ethereum is not available")
    }  

  }, []);

  const initialGame = async () => {
      try {
        if (!address) {
          console.error("钱包地址不可用");
          setMessage("请先连接钱包");
          return;
        }
        const response = await fetch(`/api?player=${address}`, {
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

  async function handleHit() {
    if (!address) {
      console.error("钱包地址不可用");
      setMessage("请先连接钱包");
      return;
    }
    const response = await fetch("/api", {
      //发送请求时携带 token
      headers: {
        authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      method: "POST",
      body: JSON.stringify({action: "hit", player: address})
    })
    const { playerHand, dealerHand, message, score } = await response.json()
    setPlayerHand(playerHand)
    setDealerHand(dealerHand)
    setMessage(message)
    setScore(score)

  }

  async function handleStand() {
    if (!address) {
      console.error("钱包地址不可用");
      setMessage("请先连接钱包");
      return;
    }
    const response = await fetch("/api", {
       //发送请求时携带 token
       headers: {
         authorization: `Bearer ${localStorage.getItem("token")}`,
       },
       method: "POST",
       body: JSON.stringify({action: "stand", player: address})
     })
    const { playerHand, dealerHand, message, score } = await response.json()
    setPlayerHand(playerHand)
    setDealerHand(dealerHand)
    setMessage(message)
    setScore(score)
  }

  async function handleReset() {
    if (!address) {
      console.error("钱包地址不可用");
      setMessage("请先连接钱包");
      return;
    }
    const response = await fetch(`/api?player=${address}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })

    const { playerHand, dealerHand, message, score } = await response.json()
    setPlayerHand(playerHand)
    setDealerHand(dealerHand)
    setMessage(message)
    setScore(score)
  }
  async function handleSendTx() {
    // 这里可以添加发送交易的逻辑
    // 获取合约地址
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    // 获取合约ABI
    const contractABI =  parseAbi([process.env.NEXT_PUBLIC_CONTRACT_ABI || ""]);
    // publicClient - 模拟交易
    // walletClient - 真正交易
    if (!publicClient || !walletClient) {
      console.error("Public client or wallet client is not initialized");
      return;
    }
   
    /**
     * simulateContract = 本地 dry-run，检查会不会成功，预估 gas。
     * writeContract = 真实交易，消耗 gas，打进区块。
     * 正确姿势一般是 先 simulateContract → 再用 simulation.request 去 writeContract。
     * simulateContract() → “演练一下，不花钱，看会不会翻车”
     *  writeContract() → “真的上路开车，花油钱”
    */
    const simulation = publicClient.simulateContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "sendRequest",
      args: [[address], address], 
      account: address
    });

    // 打印整个 simulation 对象
    console.log("Simulation result:", simulation);
    // 分开打印关键字段
    console.log("预估 Gas:", simulation.request.gas);
    console.log("返回值:", simulation.result);
    console.log("模拟生成的 request 对象:", simulation.request);

    const txHash = await walletClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "sendRequest",
      args: [[address], address], 
      account: address
    });
    console.log("Transaction hash:", txHash);
    // 这里可以添加处理交易结果的逻辑
    // 例如，监听交易确认、更新状态等
    // 注意：确保在调用此函数之前，已经连接了钱包并且有足够的余额来支付交易费用
    console.log("Transaction sent successfully");
    setMessage("交易已发送，请等待确认"); 


  }
  async function handleSign() {
    try {
      if (!address) {
        console.error("No wallet address available")
        return
      }
      
      const messageToSign = `Welcome to the 21 点 game at ${new Date().toString()}, please sign this message to prove you are the owner of the wallet.`
      console.log("Signing message:", messageToSign)
      
      const signature = await signMessageAsync({
        message: messageToSign
      })
      
      console.log("Signature:", signature)
      console.log("Address:", address)
      
      const requestBody = {
        signature,
        message: messageToSign,
        player: address,
        action: "auth"
      }
      
      console.log("Request body:", requestBody)
      
      const response = await fetch("/api", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log("Response status:", response.status)
      
      if(response.status === 200) {
        console.log("Signature is valid")
        const { token } = await response.json() //签名成功，返回一个 token
        console.log("Token received:", token)
        // 将 token 存储在 localStorage 中
        // 这里可以根据需要存储 token，例如用于后续的 API 请求验证
        localStorage.setItem("token", token)
        setSignedIn(true)
        setMessage("")
        initialGame()
      } else {
        const errorData = await response.json()
        console.error("Signature verification failed:", errorData)
      }
    } catch (error) {
      console.error("Error in handleSign:", error)
    }
  }
  if (!signedIn) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center min-h-screen p-4 bg-green-100">
          <ConnectButton />
          <button onClick={handleSign} className="p-2 bg-amber-300 rounded-lg font-bold">签名</button>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-screen p-4 bg-green-100">
      <ConnectButton />
      <h1 className="text-3xl font-bold">Welcome to the 21 点 游戏</h1>
      <h1 className="my-4 text-4xl bold">游戏得分 Score: {score}</h1>
      <button onClick={handleSendTx} className="p-2 bg-amber-300 rounded-lg font-bold">get NFT</button>
      <h2 className={`text-2xl font-bold ${message.includes("win") ? "bg-green-200" : "bg-red-300"}`}>{message}</h2>
      {/* 庄家 */}
      <div>
        <h2 className="text-2xl font-bold mb-2 text-center">庄家</h2>
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
        <h2 className="text-2xl font-bold mb-2 text-center">玩家</h2>
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
