import { CircularProgress } from "@material-ui/core";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import IconButton from "@material-ui/core/IconButton";
import CheckCircleOutlinedIcon from "@material-ui/icons/CheckCircleOutlined";
import CloseOutlinedIcon from "@material-ui/icons/CloseOutlined";
import ErrorOutlineOutlinedIcon from "@material-ui/icons/ErrorOutlineOutlined";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import WarningOutlinedIcon from "@material-ui/icons/WarningOutlined";
import * as anchor from "@project-serum/anchor";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";
import Countdown from "react-countdown";
import styled from "styled-components";
import MintImg from "./assets/images/Snake-Guy.webp";
import {
  awaitTransactionSignatureConfirmation,
  CandyMachine,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";
import "./Home.css";

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

// const MintContainer = styled.div``; // add your styles here

// const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [nftCount, setNftCount] = useState<number>(0);
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT
  const [mintValue] = useState(1);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const onMint = async () => {
    for (let index = 0; index < mintValue; index++) {
      try {
        setIsMinting(true);
        if (wallet.connected && candyMachine?.program && wallet.publicKey) {
          const mintTxId = await mintOneToken(
            candyMachine,
            props.config,
            wallet.publicKey,
            props.treasury
          );

          const status = await awaitTransactionSignatureConfirmation(
            mintTxId,
            props.txTimeout,
            props.connection,
            "singleGossip",
            false
          );

          if (!status?.err) {
            setAlertState({
              open: true,
              message: "Congratulations, Successfully Minted.",
              subMessage: `If you want to mint one more, press "MINT" again.`,
              severity: "success",
            });
          } else {
            setAlertState({
              open: true,
              message: "Error",
              subMessage: "Minting failed!! Please try again.",
              severity: "error",
            });
          }
        }
      } catch (error: any) {
        // TODO: blech:
        let message = "Error";
        let subMessage = error.msg || "Minting failed!! Please try again.";
        if (!error.msg) {
          if (error.message.indexOf("0x138")) {
          } else if (error.message.indexOf("0x137")) {
            subMessage = `SOLD OUT!`;
          } else if (error.message.indexOf("0x135")) {
            subMessage = `Insufficient funds to mint!! Please fund your wallet.`;
          }
        } else {
          if (error.code === 311) {
            subMessage = `SOLD OUT!`;
            setIsSoldOut(true);
          } else if (error.code === 312) {
            subMessage = `Minting period hasn't started yet.`;
          }
        }

        setAlertState({
          open: true,
          message,
          subMessage,
          severity: "error",
        });
      } finally {
        if (wallet?.publicKey) {
          const balance = await props.connection.getBalance(wallet?.publicKey);
          setBalance(balance / LAMPORTS_PER_SOL);
          await getNFTAmount();
        }
        setIsMinting(false);
      }
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet?.publicKey) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
        await getNFTAmount();
      }
    })();
    // eslint-disable-next-line
  }, [wallet, props.connection]);

  useEffect(() => {
    (async () => {
      setInterval(async () => {
        await getNFTAmount();
      }, 60000);
    })();
  });

  useEffect(() => {
    (async () => {
      if (isSoldOut) {
        setAlertState({
          open: true,
          message: "SOLD OUT",
          subMessage: `Thanks for minting from public sale.`,
          severity: "success",
        });
      }
    })();
  }, [isSoldOut]);

  useEffect(() => {
    (async () => {
      if (
        !wallet ||
        !wallet.publicKey ||
        !wallet.signAllTransactions ||
        !wallet.signTransaction
      ) {
        return;
      }

      const anchorWallet = {
        publicKey: wallet.publicKey,
        signAllTransactions: wallet.signAllTransactions,
        signTransaction: wallet.signTransaction,
      } as anchor.Wallet;

      const { candyMachine, goLiveDate, itemsRemaining } =
        await getCandyMachineState(
          anchorWallet,
          props.candyMachineId,
          props.connection
        );

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  }, [wallet, props.candyMachineId, props.connection]);

  const getNFTAmount = async () => {
    const anchorWallet = {
      publicKey: wallet.publicKey,
      signAllTransactions: wallet.signAllTransactions,
      signTransaction: wallet.signTransaction,
    } as anchor.Wallet;

    const { itemsRemaining, itemsRedeemed } = await getCandyMachineState(
      anchorWallet,
      props.candyMachineId,
      props.connection
    );

    console.log(itemsRemaining);

    setNftCount(itemsRedeemed);
    setIsSoldOut(itemsRemaining === 0);
  };

  return (
    <div className="page-container">
      <div className="page-bg"></div>
      <section className="page-section">
        <div className="content">
          <div className="mint-img-address">
            <div className="mint-img">
              <img src={MintImg} alt="hero_image" />
              {!wallet.connected ? (
                <ConnectButton className="connect-wallet-btn">
                  Connect Wallet
                </ConnectButton>
              ) : (
                <button
                  className="mint-dragon-btn"
                  disabled={isSoldOut || isMinting || !isActive}
                  onClick={onMint}
                >
                  {isSoldOut ? (
                    "Sold Out"
                  ) : isActive ? (
                    isMinting ? (
                      <CircularProgress />
                    ) : (
                      <span> Mint</span>
                      // <span> {mintValue} Mint</span>
                    )
                  ) : (
                    <Countdown
                      date={startDate}
                      onMount={({ completed }) =>
                        completed && setIsActive(true)
                      }
                      onComplete={() => setIsActive(true)}
                      renderer={renderCounter}
                    />
                  )}
                </button>
              )}
            </div>
            <div className="mint-row-center">
              {wallet.connected && (
                <span className="wallet-address">
                  Wallet Address: <br />
                  {shortenAddress(wallet.publicKey?.toBase58() || "")}
                </span>
              )}
            </div>
          </div>
          <div className="mint-details">
            <div className="mint-description">
              <h2>MINT</h2>

              <p className="mint-desc">Mint a Alpha Dragon</p>
              <p className="mint-desc">Minting a Dragon will cost 0.55 SOL.</p>
              <p className="mint-desc">
                It is recommended that you have an additional
              </p>
              <p className="mint-desc">0.05 SOL for gas fees.</p>
            </div>
            <div className="flex-column">
              <div className="mint-desc-grid">
                <div className="mint-desc-container">
                  <span className="mint-desc-heading">Wallet Balance</span>
                  {!wallet.connected ? (
                    <span className="mint-desc-value">0.00 SOL</span>
                  ) : (
                    <span className="mint-desc-value">
                      {(balance || 0).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="mint-desc-container">
                  <span className="mint-desc-heading">NFT Price</span>
                  <span className="mint-desc-value">0.001 SOL</span>
                </div>
                <div className="mint-desc-container">
                  <span className="mint-desc-heading">NFTs Minted</span>
                  {!wallet.connected ? (
                    <span className="mint-desc-value">0</span>
                  ) : (
                    <span className="mint-desc-value">{nftCount}</span>
                  )}
                </div>
              </div>

              {/* <MintContainer className="mintContainer">
                {wallet.connected && (
                  <div className="flex-column">
                    <div className="mint-slider-container">
                      <div className="mint-slider">
                        <Slider
                          className="slider-css"
                          defaultValue={0}
                          step={25}
                          min={1}
                          marks={mintRange}
                          valueLabelDisplay="on"
                          onChange={onSliderValueChange}
                          valueLabelFormat={(value) => (
                            <div>
                              {Math.floor(value / 25) == 0
                                ? 1
                                : Math.floor(value / 25) + 1}
                            </div>
                          )}
                        />
                      </div>
                      <MintButton
                        className="mint-btn"
                        disabled={isSoldOut || isMinting || !isActive}
                        onClick={onMint}
                        variant="contained"
                      >
                        {isSoldOut ? (
                          "Sold Out"
                        ) : isActive ? (
                          isMinting ? (
                            <CircularProgress />
                          ) : (
                            <span> {mintValue} Mint</span>
                          )
                        ) : (
                          <Countdown
                            date={startDate}
                            onMount={({ completed }) =>
                              completed && setIsActive(true)
                            }
                            onComplete={() => setIsActive(true)}
                            renderer={renderCounter}
                          />
                        )}
                      </MintButton>
                    </div>
                  </div>
                )}
              </MintContainer> */}
            </div>
          </div>
        </div>
        {/* <div className="section-body content-container">
          <div className="section-content">
            <div className="flex-column">
              <span
                className={[
                  "mint-section-title title-center",
                  wallet.connected ? "wallet-connected-title" : "",
                ].join(" ")}
              >
                NFT Public Sale
              </span>
              <div className="mint-row-center">
                {wallet.connected && (
                  <span className="wallet-address">
                    Wallet Address:{" "}
                    {shortenAddress(wallet.publicKey?.toBase58() || "")}
                  </span>
                )}
              </div>
              <div className="mint-desc-grid">
                <div className="mint-desc-container">
                  <span className="mint-desc-heading">Wallet Balance</span>
                  {!wallet.connected ? (
                    <span className="mint-desc-value">0.00 SOL</span>
                  ) : (
                    <span className="mint-desc-value">
                      {(balance || 0).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="mint-desc-container">
                  <span className="mint-desc-heading">NFT Price</span>
                  <span className="mint-desc-value">0.001 SOL</span>
                </div>
                <div className="mint-desc-container">
                  <span className="mint-desc-heading">NFTs Minted</span>
                  {!wallet.connected ? (
                    <span className="mint-desc-value">0</span>
                  ) : (
                    <span className="mint-desc-value">{nftCount}</span>
                  )}
                </div>
              </div>
              <div className="mint-row-center">
                {!wallet.connected && (
                  <ConnectButton className="connect-wallet-btn">
                    Connect Wallet
                  </ConnectButton>
                )}
              </div>

              <MintContainer className="mintContainer">
                {wallet.connected && (
                  <div className="flex-column">
                    <div className="mint-slider-container">
                      <div className="mint-slider">
                        <Slider
                          className="slider-css"
                          defaultValue={0}
                          step={25}
                          min={1}
                          marks={mintRange}
                          valueLabelDisplay="on"
                          onChange={onSliderValueChange}
                          valueLabelFormat={(value) => (
                            <div>
                              {Math.floor(value / 25) == 0
                                ? 1
                                : Math.floor(value / 25) + 1}
                            </div>
                          )}
                        />
                      </div>
                      <MintButton
                        className="mint-btn"
                        disabled={isSoldOut || isMinting || !isActive}
                        onClick={onMint}
                        variant="contained"
                      >
                        {isSoldOut ? (
                          "Sold Out"
                        ) : isActive ? (
                          isMinting ? (
                            <CircularProgress />
                          ) : (
                            <span> {mintValue} Mint</span>
                          )
                        ) : (
                          <Countdown
                            date={startDate}
                            onMount={({ completed }) =>
                              completed && setIsActive(true)
                            }
                            onComplete={() => setIsActive(true)}
                            renderer={renderCounter}
                          />
                        )}
                      </MintButton>
                    </div>
                  </div>
                )}
              </MintContainer>
            </div>
          </div>
        </div> */}
      </section>

      <Dialog
        className="messageContainer"
        aria-labelledby="confirmation-dialog-title"
        open={alertState.open}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <DialogTitle className="dialogHeading" id="confirmation-dialog-title">
          <div className="flexRowBetween">
            <span className="dialogTitle"></span>
            <IconButton
              onClick={() => setAlertState({ ...alertState, open: false })}
            >
              <CloseOutlinedIcon className="dialogCloseIcon" />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent>
          <div className="flexColumnCenter">
            {alertState.severity === "error" && (
              <ErrorOutlineOutlinedIcon className="errorIcon" />
            )}
            {alertState.severity === "success" && (
              <CheckCircleOutlinedIcon className="successIcon" />
            )}
            {alertState.severity === "warning" && (
              <WarningOutlinedIcon className="warningIcon" />
            )}
            {alertState.severity === "info" && (
              <InfoOutlinedIcon className="infoIcon" />
            )}
            <span
              className={[
                "default-class",
                alertState.severity === "error" ? "errorMsg" : "",
                alertState.severity === "success" ? "successMsg" : "",
                alertState.severity === "warning" ? "warningMsg" : "",
                alertState.severity === "info" ? "infoMsg" : "",
              ].join(" ")}
            >
              {alertState.message}
            </span>
            <span
              className={[
                "subMessage",
                alertState.severity === "error" ? "errorMsg" : "",
                alertState.severity === "success" ? "successMsg" : "",
                alertState.severity === "warning" ? "warningMsg" : "",
                alertState.severity === "info" ? "infoMsg" : "",
              ].join(" ")}
            >
              {alertState.subMessage}
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  subMessage?: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
