import React from 'react';

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
};

export const Button = (props: ButtonProps) => {
  return (
    <button
      onClick={props.onClick}
      style={{
        padding: '8px 16px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: props.variant === 'secondary' ? '#6c757d' : '#007bff',
        color: 'white',
        cursor: 'pointer',
      }}
    >
      {props.children}
    </button>
  );
};
