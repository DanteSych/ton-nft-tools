import React, { useEffect, useState } from 'react'
import './App.css'
import TonWeb from 'tonweb'
import * as constants from '../constants.config'
import logo from './assets/logo.png'
import { useAlert } from 'react-alert'
// import { EXPLORER_URL } from '../constants.config'
import { TonConnectButton } from "@tonconnect/ui-react"
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react'

const { NftCollection, NftItem } = TonWeb.token.nft

// TonWeb API

const tonweb = new TonWeb(new TonWeb.HttpProvider(
  constants.NETWORK,
  {
    apiKey: constants.API_KEY,
  }))

const App = () => {
  const tonAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [IsSuccess, setIsSuccess] = useState(false);
  const alert = useAlert()

  const [walletHistory, setWalletHistory] = useState({})
  const [walletAddress, setWalletAddress] = useState('')

  // collection settings
  const [url, setUrl] = useState('https://nftstorage.link/ipfs/bafybeiacdq67salv4mx2g3fnnaonfytwmmwkdsvq6b5nt6jwv6kx3ktezu/_metadata.json')
  const [royalty, setRoyalty] = useState('10')
  const [nftItemsUrl, setNftItemsUrl] = useState('https://nftstorage.link/ipfs/bafybeiacdq67salv4mx2g3fnnaonfytwmmwkdsvq6b5nt6jwv6kx3ktezu/')
  const [nftCollection, setNftCollection] = useState(null)
  const [collectionAddress, setCollectionAddress] = useState(null)
  const [collectionHistory, setCollectionHistory] = useState({})
  const [nfts, setNfts] = useState(null)
  const [CollectionUrl, setCollectionUrl] = useState('');

  // nft item settings
  const [nftIndex, setNftIndex] = useState('')
  const [nftContentFile, setNftContentFile] = useState('')

  // page settings
  const [loading, setLoading] = useState(false)

  const onUrlChange = (event) => {
    setUrl(event.target.value)
  }
  const onRoyaltyChange = (event) => {

    setRoyalty(event.target.value)
  }

  const onNftItemsUrlChange = (event) => {
    setNftItemsUrl(event.target.value)
  }

  const onNftIndexChange = (event) => {
    setNftIndex(event.target.value)
  }
  const onNftContentFileChange = (event) => {
    setNftContentFile(event.target.value)
  }

  const connectWallet = async () => {
    setLoading(true)

    try {

      const walletAddressTon = new TonWeb.utils.Address(
        tonAddress)

      const tx = await tonweb.getTransactions(walletAddressTon);

      console.log(tx);

      setWalletAddress(walletAddressTon)
      setWalletHistory(await tonweb.getTransactions(walletAddressTon))

    } catch (e) {
      console.error(e)
    }

    setLoading(false)
  }

  const getCollectionInfo = async () => {
    const collection = collection
  }

  /**
   * Deploy a new NFT Collection to the blockchain
   */
  const deployNftCollection = async () => {
    setLoading(true)

    const nftCollection = new NftCollection(tonweb.provider, {
      ownerAddress: walletAddress, // owner of the collection
      royalty: royalty / 100, // royalty in %
      royaltyAddress: walletAddress, // address to receive the royalties
      collectionContentUri: url, // url to the collection content
      nftItemContentBaseUri: nftItemsUrl, // url to the nft item content
      nftItemCodeHex: NftItem.codeHex, // format of the nft item
    })
    console.log('Collection data:',
      nftCollection)
    const nftCollectionAddress = await nftCollection.getAddress()
    setCollectionUrl(nftCollectionAddress.toString(true, true, true));

    // check if the collection already exists
    let addresses = new Set()
    walletHistory.forEach(el => {
      try {
        addresses.add(el.out_msgs[0].destination)
      } catch (e) { }
    })

    if (addresses.has(nftCollectionAddress.toString(true, true, true))) {
      console.log('Collection already deployed!')
      alert.show(
        'Collection already in blockchain 💎 — feel free to add new NFTs!')

      setNftCollection(nftCollection)
      setCollectionAddress(nftCollectionAddress)
      const history = await tonweb.getTransactions(nftCollectionAddress)
      console.log('Collection history [1]:', history)
      setCollectionHistory(history)

      //await getInfo(nftCollection)

      setLoading(false)
      return
    }

    console.log('Collection address (changes with provided data):',
      nftCollectionAddress.toString(true, true, true))

    const stateInit = (await nftCollection.createStateInit()).stateInit
    const stateInitBoc = await stateInit.toBoc(false)
    const stateInitBase64 = TonWeb.utils.bytesToBase64(stateInitBoc)

    let a = new TonWeb.boc.Cell();
    a.bits.writeUint(0, 32);
    a.bits.writeString("Deploy collection!");
    let payload = TonWeb.utils.bytesToBase64(await a.toBoc());

    console.log(payload);

    const transaction = {
      validUntil: Math.floor(new Date() / 1000) + 360,
      messages: [
        {
          address: (nftCollectionAddress).toString(true, true, true),
          amount: TonWeb.utils.toNano(0.05.toString()).toString(),
          stateInit: stateInitBase64,
          payload: payload
        }
      ]
    }

    const tx = await tonConnectUI.sendTransaction(transaction);

    console.log(tx);

    setIsSuccess(true);
  }

  const getInfo = async (nftCollection) => {
    setLoading(true)

    try {

      const data = await nftCollection.getCollectionData()
      data.ownerAddress = data.ownerAddress.toString(true, true, true)

      console.log('Collection data:')
      console.log(data)

      const royaltyParams = await nftCollection.getRoyaltyParams()
      royaltyParams.royaltyAddress = royaltyParams.royaltyAddress.toString(true,
        true, true)
      console.log('Collection royalty params:')
      console.log(royaltyParams)

      const nftItemAddress0 = (await nftCollection.getNftItemAddressByIndex(
        0)).toString(true, true, true)
      console.log('NFT "item 0" address:')
      console.log(nftItemAddress0)

      const nftItem = new NftItem(tonweb.provider, { address: nftItemAddress0 })

      const nftData = await nftCollection.methods.getNftItemContent(nftItem)
      nftData.collectionAddress = nftData.collectionAddress.toString(true, true,
        true)

      nftData.ownerAddress = nftData.ownerAddress?.toString(true, true, true)
      console.log('NFT "item 0" data:')
      console.log(nftData)

    } catch (e) {
      console.log(e)

      setTimeout(() => {
        alert.show('Error to parse collection info, open the console to see the error')
      }, 3100)
    }
    setLoading(false)
  }

  const renderCreateCollectionContainer = () => (
    <div className={'connected-container'}>

      <form onSubmit={(event) => {
        event.preventDefault()
        deployNftCollection()
      }}>
        <div className="">
          <p>
            <input type="text"
              placeholder={'URL to collection .json file'}
              value={url}
              onChange={onUrlChange} />
          </p>
          <p>
            <input type="text"
              placeholder={'URL where NFT .json configs stored'}
              value={nftItemsUrl}
              onChange={onNftItemsUrlChange} />
          </p>
          <p>
            <input max={'100'} type="text" placeholder={'Collection royalty (0-100%)'}
              value={royalty}
              onChange={onRoyaltyChange} />
          </p>
        </div>

        <div className="">
          <button type={'submit'}
            className={'cta-button secondary-button'}>Create collection
          </button>
        </div>
      </form>

    </div>
  )

  // useEffect(() => {
  //   if (walletAddress) {
  //     getCollectionInfo()
  //   }
  // }, [collectionData])

  useEffect(() => {
    if (!tonAddress) {
      setWalletAddress('');
    } else {
      connectWallet();
    }
    console.log('address ton: ' + tonAddress);
  }, [tonAddress])

  return (
    <div className="App">
      <div className={nftCollection ? 'authed-container' : 'container'}>
        <div className="header-container">

          <p className="header"><span className='gradient-text'
          >Deploy NFT Collection</span></p>
          <div className='wrapper-button-connect'>
            <TonConnectButton />
          </div>
          <p className="sub-text">
            Deploy your first NFT collection in TON blockchain! ✨
          </p>

          {loading && (<div className="loading-container">
            <div className="lds-dual-ring">
            </div>
          </div>)}

          {(walletAddress && !collectionAddress && !nfts && !loading && !IsSuccess) &&
            renderCreateCollectionContainer()}
          {IsSuccess &&
            <div>
              <p className='success-alert gradient-text'>Deploy Success!</p>
              <div>
                {constants.TEST_NETWORK === true ?
                  <a href={`https://testnet.tonviewer.com/${CollectionUrl}`} target='_blank' className='view-explorer gradient-text'>View on explorer</a>
                  :
                  <a href={`https://tonviewer.com/${CollectionUrl}`} target='_blank' className='view-explorer gradient-text'>View on explorer</a>
                }
              </div>
              <button className='cta-button retry-btn' onClick={() => {
                setIsSuccess(false);
                setCollectionUrl('');
              }}>Try Again</button>
            </div>
          }

        </div>

        <div className={walletAddress
          ? 'footer-container footer-relative'
          : 'footer-container'}>
          <p className={'footer-text'}>
            Powered by <img width={20} style={{ verticalAlign: 'middle' }}
              src={logo} alt="" /> <a className={'footer-text'}
                href="https://tonbuilders.com"> TON Builders</a> team | TON Minter
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
