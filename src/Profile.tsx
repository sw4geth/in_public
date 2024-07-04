import React from 'react';
import { useZoraUsername } from '@zoralabs/nft-hooks';

interface UserProfileProps {
  address: string
}

const UserProfile: React.FC<UserProfileProps> = ({ address }) => {
  const { error, username } = useZoraUsername(address)

  if (error) {
    return <div>Error loading username: {error.message}</div>
  }

  if (!username) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>User Profile</h1>
      <p>Username: {username}</p>
    </div>
  )
}

export default UserProfile
