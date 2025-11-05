import React from "react";

interface User {
  id: number;
  name: string;
}
const UserProfile = async () => {
  const data = await fetch("https://jsonplaceholder.typicode.com/users");
  const users: User[] = await data.json();
  return (
    <>
      <h1>User Profile</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </>
  );
};

export default UserProfile;
