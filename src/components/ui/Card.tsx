import React from "react";

type Props = {
  cardTopic: string;
  cardEmoji: string;
  cardValue: number | string;
  cardDescription1: string;
  cardDescription2: string;
};

const Card = ({ cardTopic, cardEmoji, cardValue, cardDescription1, cardDescription2 }: Props) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-blue-100">
      <div className="flex items-center mb-4">
        <div className="bg-blue-100 p-3 rounded-lg mr-4">
          <span className="text-2xl">{cardEmoji}</span>
        </div>
        <div>
          <p className="text-sm text-blue-400">{cardTopic}</p>
          <h3 className="text-2xl font-bold text-blue-800">{cardValue}</h3>
        </div>
      </div>
      <div className="text-sm text-blue-600">
        <span className="text-green-500">{cardDescription1}</span>
        {cardDescription2}
      </div>
    </div>
  );
};

export default Card;
