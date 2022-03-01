import { Card } from "semantic-ui-react";
import web3 from "../../web3";

interface ContractCardsProps {
  creator: string;
  referee: string;
  failureRecipient: string;
  amount: string;
  status: string;
}

const ContractCards = ({
  creator,
  referee,
  failureRecipient,
  status,
  amount,
}: ContractCardsProps) => {
  const cards = [
    {
      header: "Status",
      description: status,
      meta: "Status",
    },
    {
      header: "Creator",
      description: creator,
      meta: "Creator of the contract.",
      raised: true,
      style: { overflowWrap: "break-word" },
    },
    {
      header: "Referee",
      description: referee,
      meta: "Referee of the contract.",
      raised: true,
      style: { overflowWrap: "break-word" },
    },
    {
      header: "Amount",
      description: web3.utils.fromWei(amount, "ether"),
    },
    {
      header: "Failure recipient",
      description: failureRecipient,
      meta: "Where the money is sent if contract is failed.",
      raised: true,
      style: { overflowWrap: "break-word" },
    },
  ];
  return (
    <Card.Group
      items={cards.map((card, index) => ({
        ...card,
        key: index,
      }))}
    />
  );
};

export default ContractCards;
