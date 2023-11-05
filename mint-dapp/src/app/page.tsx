'use client'

import CustomFont from 'next/font/local'
import { useState, useEffect } from 'react'
import { THEME, TonConnectUIProvider } from '@tonconnect/ui-react'
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'

import TonWeb from 'tonweb'
import Deployer from '../../deployer'
import { getHttpEndpoint } from "@orbs-network/ton-access"
import { TonClient, Address } from "ton"
import { Config as DeployConfig, Nft } from '../../models'
import { checkConfig } from '../../config'

const { NftCollection, NftItem } = TonWeb.token.nft

const cfont = CustomFont({
  src: '../../public/font/CraftonDemo.otf',
  variable: '--font-cfont',
})

export default function Home() {
  useEffect(() => {
    const initTerminal = async () => {
      const eruda = await import("eruda");
      eruda.default.init();
      // Add logic with `term`
    }
    initTerminal()
  }, [])

  return (
    <TonConnectUIProvider
      manifestUrl="https://mint.rektapeton.club/tonconnect-manifest.json"
      uiPreferences={{ theme: THEME.LIGHT }}
    >
      <Content />
    </TonConnectUIProvider>
  );
}


const Content = () => {
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const targetDate = new Date('2023-11-06T14:00:00Z').getTime();
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining(targetDate));
  const network = 'testnet';
  const [IsLoadMint, setIsLoadMint] = useState(false);
  const [IsSuccess, setIsSuccess] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [IsSoldOut, setIsSoldOut] = useState(false);
  const [Remaining, setRemaining] = useState(0);
  const [config, setConfig] = useState<DeployConfig>({
    walletMnemonic: '',
    walletType: '',
    walletAddress: '',

    startIndex: 0,

    tonApiUrl: '',
    tonApiKey: '',

    collection: {
      royalty: 0,
      content: '',
      base: '',
    },

    deployAmount: '',
    topupAmount: '',
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [targetDate]);

  function calculateTimeRemaining(targetDate: any) {
    const now = new Date().getTime();
    const timeDifference = targetDate - now;

    if (timeDifference <= 0) {
      // Countdown has ended
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
      };
    }

    const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

    return {
      days,
      hours,
      minutes,
      seconds,
    };
  };

  // useEffect(() => {
  //   console.log(logs);
  // }, [logs]);

  useEffect(() => {
    setConfig({
      walletMnemonic: process.env.NEXT_PUBLIC_WALLET_MNEMONIC || '',
      walletType: process.env.NEXT_PUBLIC_WALLET_TYPE || '',
      walletAddress: process.env.NEXT_PUBLIC_WALLET_ADDRESS || '',

      startIndex: Number(process.env.NEXT_PUBLIC_START_INDEX) || 0,

      tonApiUrl: process.env.NEXT_PUBLIC_TON_API_URL || '',
      tonApiKey: process.env.NEXT_PUBLIC_TON_API_KEY || '',

      collection: {
        royalty: Number(process.env.NEXT_PUBLIC_COLLECTION_ROYALTY) || 0,
        content: process.env.NEXT_PUBLIC_COLLECTION_CONTENT || '',
        base: process.env.NEXT_PUBLIC_COLLECTION_BASE || '',
      },

      deployAmount: process.env.NEXT_PUBLIC_DEPLOY_AMOUNT || '',
      topupAmount: process.env.NEXT_PUBLIC_TOPUP_AMOUNT || '',
    })
  }, []);

  useEffect(() => {
    let timer: any;

    if (IsSuccess) {
      timer = setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [IsSuccess]);

  useEffect(() => {
    if (config.walletAddress === '') {
      return;
    }

    const checkAvaibility = async () => {
      const endpoint = await getHttpEndpoint({
        network: network,
      });
      const tonweb = new TonWeb(new TonWeb.HttpProvider(endpoint));
      // initialize ton library
      const client = new TonClient({ endpoint });

      const walletAddressTon = new TonWeb.utils.Address(
        config.walletAddress);

      const royalty = Number(process.env.NEXT_PUBLIC_COLLECTION_ROYALTY) * 100;
      const nftCollection = new NftCollection(tonweb.provider, {
        ownerAddress: walletAddressTon, // owner of the collection
        royalty: royalty / 100, // royalty in %
        royaltyAddress: walletAddressTon, // address to receive the royalties
        collectionContentUri: config.collection?.content, // url to the collection content
        nftItemContentBaseUri: config.collection?.base, // url to the nft item content
        nftItemCodeHex: NftItem.codeHex, // format of the nft item
      });
      const nftCollectionAddress = await nftCollection.getAddress()

      const addressCollection = Address.parseFriendly(nftCollectionAddress.toString(true, true, true)).address;
      const trs = await client.getTransactions(addressCollection, {
        limit: 100
      });
      const count = trs.reduce((total: any, item: any) => {
        if (item.outMessagesCount !== 0) {
          return total + 1;
        }
        return total;
      }, 0);
      setRemaining(count - 1);

      if (count > Number(process.env.NEXT_PUBLIC_MAX_SUPPLY)) {
        setRemaining(Number(process.env.NEXT_PUBLIC_MAX_SUPPLY));
        setIsSoldOut(true);
        return;
      }
    }

    checkAvaibility();
  }, [config, IsSuccess]);

  const addLog = (text: string) => {
    setLogs((logs: any) => [...logs, text])
  }

  const checkProcess = (value: boolean) => {
    setIsLoadMint(value);
  }

  const checkSuccess = (value: boolean) => {
    setIsSuccess(value);
  }

  const startDeploy = async () => {
    const endpoint = await getHttpEndpoint({
      network: network,
    });
    const tonweb = new TonWeb(new TonWeb.HttpProvider(endpoint));

    // initialize ton library
    const client = new TonClient({ endpoint });
    try {
      const walletAddressTon = new TonWeb.utils.Address(
        config.walletAddress);

      const royalty = Number(process.env.NEXT_PUBLIC_COLLECTION_ROYALTY) * 100;
      const nftCollection = new NftCollection(tonweb.provider, {
        ownerAddress: walletAddressTon, // owner of the collection
        royalty: royalty / 100, // royalty in %
        royaltyAddress: walletAddressTon, // address to receive the royalties
        collectionContentUri: config.collection?.content, // url to the collection content
        nftItemContentBaseUri: config.collection?.base, // url to the nft item content
        nftItemCodeHex: NftItem.codeHex, // format of the nft item
      });
      const nftCollectionAddress = await nftCollection.getAddress()
      const addressCollection = Address.parseFriendly(nftCollectionAddress.toString(true, true, true)).address;
      const trs = await client.getTransactions(addressCollection, {
        limit: 100
      });

      const count = trs.reduce((total: any, item: any) => {
        if (item.outMessagesCount !== 0) {
          return total + 1;
        }
        return total;
      }, 0);

      if (count > Number(process.env.NEXT_PUBLIC_MAX_SUPPLY)) {
        alert('The NFT is already sold out.');
        return;
      }

      //   const transaction = {
      //     validUntil: Math.floor(new Date().getTime() / 1000) + 360,
      //     messages: [
      //       {
      //         address: config.walletAddress,
      //         amount: TonWeb.utils.toNano(3.5.toString()).toString(),
      //       }
      //     ]
      //   }

      //   const tx = await tonConnectUI.sendTransaction(transaction);
      //   console.log(tx);

      let countToken = 0;
      if (count === 0) {
        countToken = countToken;
      } else {
        countToken = count - 1;
      }

      setIsLoadMint(true);
      await checkConfig(config)
      let nftMint = [{
        id: countToken,
        owner_address: tonAddress,
      }];

      const _deployer = new Deployer(config, nftMint, addLog, checkProcess, checkSuccess)
      await _deployer.start()
      // setDeployer(_deployer)
    } catch (e) {
      console.log('error deploying');
      console.log(e);
      addLog(`${e}`)
    }
  }

  return (
    <main>
      {IsSuccess &&
        <div id="toast-simple" className="fixed z-50 bottom-0 left-1/2 transform -translate-x-1/2 m-6 flex items-center justify-center w-full max-w-xs p-4 space-x-4 bg-blight divide-x divide-gray-200 rounded-lg shadow space-x" role="alert">
          <div className="text-sm font-bold text-white">Mint NFT successful!</div>
        </div>
      }
      <div className={`${cfont.variable}`}>
        <div className="font-cfont">
          <div className='h-[300px] w-full relative flex'>
            <img className='h-full w-full object-cover object-center' src='./assets/banner.png' />
            <div className='absolute wrapper-mint w-full'>
              <div className='relative w-full'>
                <div className='absolute container-mint w-full'>
                  <div className='relative grid md:grid-cols-5 px-4 lg:px-0 lg:max-w-6xl 2xl:max-w-7xl mx-auto w-full'>
                    <div className='col-span-3'>
                      <img className='w-44 h-44 rounded-lg border-4 border-blight' src='./assets/logo.png' />
                      <div className='my-10 md:pr-10'>
                        <h1 className='text-4xl'>REKT APE TON CLUB</h1>
                        <div className='md:flex md:justify-between my-4'>
                          <div className='flex'>
                            <svg xmlns="http://www.w3.org/2000/svg" className='w-5 h-5 mr-2' viewBox="0 0 24 24"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" fill="white"></path></svg>
                            <div>
                              <p className='text-white text-sm'>November 6, 2023</p>
                              <p className='text-gray-400 text-xs'>Start Date</p>
                            </div>
                          </div>
                          {/* mint xs to lg */}
                          <div className='block md:hidden my-4 w-full h-fit p-6 bg-[#1a1a1a] rounded-lg shadow'>
                            <h1 className='text-xl'>Mint Now!</h1>
                            <hr className='my-2' />
                            <div className='grid grid-cols-2 gap-6 pt-2'>
                              <div className='bg-black rounded-lg p-4'>
                                <div className='text-center'>
                                  <p className='text-lg'>NFT Price:</p>
                                  <p className='text-sm'>3.5 TON</p>
                                </div>
                              </div>
                              <div className='bg-black rounded-lg p-4'>
                                <div className='text-center'>
                                  <p className='text-lg'>Supply:</p>
                                  <p className='text-sm'>999</p>
                                </div>
                              </div>
                            </div>

                            {tonAddress &&
                              <div className='bg-black rounded-lg p-4 mt-4'>
                                <div className='text-center'>
                                  <div className='flex justify-center space-x-4'>
                                    <div className="countdown-item">
                                      <p className="countdown-value">{timeRemaining.days}</p>
                                      <p className="countdown-label">days</p>
                                    </div>
                                    <div className="countdown-item">
                                      <p className="countdown-value">{timeRemaining.hours}</p>
                                      <p className="countdown-label">hours</p>
                                    </div>
                                    <div className="countdown-item">
                                      <p className="countdown-value">{timeRemaining.minutes}</p>
                                      <p className="countdown-label">minutes</p>
                                    </div>
                                    <div className="countdown-item">
                                      <p className="countdown-value">{timeRemaining.seconds}</p>
                                      <p className="countdown-label">seconds</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            }

                            {!IsSoldOut ?
                              <>
                                {tonAddress ?
                                  <div className='mt-4 text-center'>
                                    <p className='text-lg'>Remaining: {Remaining}/999</p>
                                    <button onClick={startDeploy} className='bg-bmidnight w-full mt-4 rounded-lg py-3'>Mint</button>
                                    <hr className='my-4' />
                                    <button onClick={async () => { await tonConnectUI.disconnect() }} className='bg-blight w-full rounded-lg py-3'>Disconnect</button>
                                  </div>
                                  :
                                  <button onClick={async () => { await tonConnectUI.openModal() }} className='bg-bmidnight w-full mt-4 rounded-lg py-3'>Connect Wallet</button>
                                }
                              </>
                              :
                              <p className="text-white text-center text-3xl mt-4">SOLD OUT!</p>
                            }
                          </div>
                          {/* end mint xs to lg */}
                          <div className='flex space-x-2 mt-2 md:mt-0'>
                            <a href='https://www.rektapeton.club/' target='_blank' className='rounded-full bg-[#101010] p-2 border border-blight'>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-globe2" viewBox="0 0 16 16"> <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855-.143.268-.276.56-.395.872.705.157 1.472.257 2.282.287V1.077zM4.249 3.539c.142-.384.304-.744.481-1.078a6.7 6.7 0 0 1 .597-.933A7.01 7.01 0 0 0 3.051 3.05c.362.184.763.349 1.198.49zM3.509 7.5c.036-1.07.188-2.087.436-3.008a9.124 9.124 0 0 1-1.565-.667A6.964 6.964 0 0 0 1.018 7.5h2.49zm1.4-2.741a12.344 12.344 0 0 0-.4 2.741H7.5V5.091c-.91-.03-1.783-.145-2.591-.332zM8.5 5.09V7.5h2.99a12.342 12.342 0 0 0-.399-2.741c-.808.187-1.681.301-2.591.332zM4.51 8.5c.035.987.176 1.914.399 2.741A13.612 13.612 0 0 1 7.5 10.91V8.5H4.51zm3.99 0v2.409c.91.03 1.783.145 2.591.332.223-.827.364-1.754.4-2.741H8.5zm-3.282 3.696c.12.312.252.604.395.872.552 1.035 1.218 1.65 1.887 1.855V11.91c-.81.03-1.577.13-2.282.287zm.11 2.276a6.696 6.696 0 0 1-.598-.933 8.853 8.853 0 0 1-.481-1.079 8.38 8.38 0 0 0-1.198.49 7.01 7.01 0 0 0 2.276 1.522zm-1.383-2.964A13.36 13.36 0 0 1 3.508 8.5h-2.49a6.963 6.963 0 0 0 1.362 3.675c.47-.258.995-.482 1.565-.667zm6.728 2.964a7.009 7.009 0 0 0 2.275-1.521 8.376 8.376 0 0 0-1.197-.49 8.853 8.853 0 0 1-.481 1.078 6.688 6.688 0 0 1-.597.933zM8.5 11.909v3.014c.67-.204 1.335-.82 1.887-1.855.143-.268.276-.56.395-.872A12.63 12.63 0 0 0 8.5 11.91zm3.555-.401c.57.185 1.095.409 1.565.667A6.963 6.963 0 0 0 14.982 8.5h-2.49a13.36 13.36 0 0 1-.437 3.008zM14.982 7.5a6.963 6.963 0 0 0-1.362-3.675c-.47.258-.995.482-1.565.667.248.92.4 1.938.437 3.008h2.49zM11.27 2.461c.177.334.339.694.482 1.078a8.368 8.368 0 0 0 1.196-.49 7.01 7.01 0 0 0-2.275-1.52c.218.283.418.597.597.932zm-.488 1.343a7.765 7.765 0 0 0-.395-.872C9.835 1.897 9.17 1.282 8.5 1.077V4.09c.81-.03 1.577-.13 2.282-.287z" fill="white"></path> </svg>
                            </a>
                            <a href='https://t.me/rektapetonclubchat' target='_blank' className='rounded-full bg-[#101010] p-2 border border-blight'>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-telegram" viewBox="0 0 16 16"> <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z" fill="white"></path> </svg>
                            </a>
                            <a href='https://t.me/rektapestonclub' target='_blank' className='rounded-full bg-[#101010] p-2 border border-blight'>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-telegram" viewBox="0 0 16 16"> <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8.287 5.906c-.778.324-2.334.994-4.666 2.01-.378.15-.577.298-.595.442-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294.26.006.549-.1.868-.32 2.179-1.471 3.304-2.214 3.374-2.23.05-.012.12-.026.166.016.047.041.042.12.037.141-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8.154 8.154 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629.093.06.183.125.27.187.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.426 1.426 0 0 0-.013-.315.337.337 0 0 0-.114-.217.526.526 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09z" fill="white"></path> </svg>
                            </a>
                            <a href='https://twitter.com/rektapeton' target='_blank' className='rounded-full bg-[#101010] p-2 border border-blight'>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 512 512" fill='currentColor'><path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" fill='white' /></svg>
                            </a>
                          </div>
                        </div>
                        <p className='text-xl mt-6 mb-4'>NFT Collection</p>
                        <div className='grid grid-cols-3 gap-2 lg:gap-0 lg:flex lg:space-x-2'>
                          <img className='rounded-lg lg:w-24 lg:h-24' src='./assets/18.gif' alt='collection' />
                          <img className='rounded-lg lg:w-24 lg:h-24' src='./assets/919.gif' alt='collection' />
                          <img className='rounded-lg lg:w-24 lg:h-24' src='./assets/961.gif' alt='collection' />
                          <img className='rounded-lg lg:w-24 lg:h-24' src='./assets/925.gif' alt='collection' />
                          <img className='rounded-lg lg:w-24 lg:h-24' src='./assets/963.gif' alt='collection' />
                        </div>
                        <p className='text-xl mt-6 mb-4'>RATC Description</p>
                        <p className='text-base font-sans'>Collections of 999 unique animated Rekt Ape NFTs operating on the TON Blockchain.This is a playground for a mad apes scientist who turns all apes into fierce mutants. The mutant is made to fight each other in a Maze whose difficulty level is outlandish to clear. there is a group that's aware and doesn't want everything to go according to the wishes of the mad scientist, they are REKT. they work together and figure out how to solve the maze without needing to fight each other. Join the REKT Club to clear the maze and save the world from the mad scientist.</p>
                      </div>
                    </div>
                    <div className='hidden md:block col-span-2 w-full h-fit p-6 bg-[#1a1a1a] rounded-lg shadow'>
                      <h1 className='text-xl'>Mint Now!</h1>
                      <hr className='my-2' />
                      <div className='grid grid-cols-2 gap-6 pt-2'>
                        <div className='bg-black rounded-lg p-4'>
                          <div className='text-center'>
                            <p className='text-lg'>NFT Price:</p>
                            <p className='text-sm'>3.5 TON</p>
                          </div>
                        </div>
                        <div className='bg-black rounded-lg p-4'>
                          <div className='text-center'>
                            <p className='text-lg'>Supply:</p>
                            <p className='text-sm'>999</p>
                          </div>
                        </div>
                      </div>

                      {tonAddress &&
                        <div className='bg-black rounded-lg p-4 mt-4'>
                          <div className='text-center'>
                            <div className='flex justify-center space-x-4'>
                              <div className="countdown-item">
                                <p className="countdown-value">{timeRemaining.days}</p>
                                <p className="countdown-label">days</p>
                              </div>
                              <div className="countdown-item">
                                <p className="countdown-value">{timeRemaining.hours}</p>
                                <p className="countdown-label">hours</p>
                              </div>
                              <div className="countdown-item">
                                <p className="countdown-value">{timeRemaining.minutes}</p>
                                <p className="countdown-label">minutes</p>
                              </div>
                              <div className="countdown-item">
                                <p className="countdown-value">{timeRemaining.seconds}</p>
                                <p className="countdown-label">seconds</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                      {!IsSoldOut ?
                        <>
                          {tonAddress ?
                            <>
                              {!IsLoadMint ?
                                <div className='mt-4 text-center'>
                                  <p className='text-lg'>Remaining: {Remaining}/999</p>
                                  <button onClick={startDeploy} className='bg-bmidnight w-full mt-4 rounded-lg py-3'>Mint</button>
                                  <hr className='my-4' />
                                  <button onClick={async () => { await tonConnectUI.disconnect() }} className='bg-blight w-full rounded-lg py-3'>Disconnect</button>
                                </div>
                                :
                                <div role="status" className="flex items-center justify-center mt-4">
                                  <svg aria-hidden="true" className="w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-white" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                                  </svg>
                                  <span className="text-white font-sans">Please wait...</span>
                                </div>
                              }
                            </>
                            :
                            <button onClick={async () => { await tonConnectUI.openModal() }} className='bg-bmidnight w-full mt-4 rounded-lg py-3'>Connect Wallet</button>
                          }
                        </>
                        :
                        <p className="text-white text-center text-3xl mt-4">SOLD OUT!</p>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
