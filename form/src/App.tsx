import React, {
  useEffect,
  useState,
  useMemo,
  ChangeEvent,
  FormEvent,
} from "react";

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Flex,
  Input,
  Label,
  Spinner,
  Text,
  ThemeProvider,
} from "theme-ui";
import queryString from "query-string";

const apiUrl = "https://pisa785pg7.execute-api.ap-southeast-2.amazonaws.com/";

type Response = {
  contactId?: string;
  firstName: string;
  lastName: string;
  email: string;
  lists: {
    id: string;
    isSubscribed: boolean;
    name: string;
  }[];
};

type Account = "visitors" | "media" | "industry";

type PostBody = {
  account?: Account;
  contactId?: String;
  email: String;
  firstName?: String;
  lastName?: String;
  listIds: String[];
};

type AlertMessage = {
  message: String;
  type: "primary" | "secondary";
};

const theme = {
  fonts: {
    body: 'Lato, "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  colors: {
    background: "#fff",
    muted: "#eee",
    outline: "#ced4da",
    primary: "#71273d",
    text: "#333",
  },
  buttons: {
    primary: {
      cursor: "pointer",
      padding: 3,
    },
    secondary: {
      bg: "muted",
      color: "text",
      cursor: "pointer",
      padding: 3,
    },
  },
  alerts: {
    primary: {
      color: "#8b6633",
      bg: "#fff8e0",
    },
    secondary: {
      color: "text",
      bg: "muted",
    },
  },
  forms: {
    input: {
      borderColor: "outline",
    },
  },
  styles: {
    root: {
      fontFamily: "body",
      fontWeight: "body",
      fontSize: 2,
    },
  },
};

function Form() {
  const [alert, setAlert] = useState<AlertMessage | null>(null);
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const params = useMemo(() => queryString.parse(window.location.search), []);

  const email = useMemo(
    () => (Array.isArray(params.email) ? params.email[0] : params.email || ""),
    [params]
  );

  const listIds = useMemo(
    () =>
      params.list_id === undefined
        ? []
        : Array.isArray(params.list_id)
        ? params.list_id
        : [params.list_id],
    [params]
  );

  const autoSave = useMemo(() => params.autoSave === "true", [params]);

  const account: Account = useMemo(
    function () {
      const accountInput = Array.isArray(params.account)
        ? params.account[0]
        : params.account || "visitors";

      return ["visitors", "industry", "media"].includes(accountInput)
        ? (accountInput as Account)
        : "visitors";
    },
    [params]
  );

  useEffect(() => {
    fetch(`${apiUrl}data.json?email=${email}&account=${account}`)
      .then(function (res) {
        if (res.ok) {
          return res.json();
        }
        throw new Error("Bad response");
      })
      .then(
        (result: Response) => {
          // For new sign ups, set the lists from the URL
          if (!result.contactId) {
            if (listIds.length) {
              result.lists.forEach(function (list) {
                list.isSubscribed = listIds.includes(list.id);
              });
            }
          }

          setData(result);
          setSaved(!!result.contactId);

          if (!autoSave) {
            setIsLoaded(true);
          }
        },
        (error) => {
          setError(error);
          setIsLoaded(true);
        }
      );
  }, [account, email, listIds, autoSave]);

  // Submit data if coming from another sign up form
  useEffect(() => {
    if (data && !saved && autoSave) {
      postData(data, account);
    }
  }, [account, autoSave, data, saved]);

  const onSubmit = function (event: FormEvent<HTMLDivElement>) {
    if (!data) {
      return;
    }

    event.preventDefault();

    postData(data, account);
  };

  const postData = function (newData: Response, account: Account) {
    setIsLoaded(false);

    let body: PostBody = {
      account,
      email: newData.email,
      firstName: newData.firstName,
      lastName: newData.lastName,
      listIds: newData.lists
        .filter((list) => list.isSubscribed)
        .map((list) => list.id),
    };

    if (newData.contactId) {
      body.contactId = newData.contactId;
    }

    fetch(apiUrl, { method: "POST", mode: "cors", body: JSON.stringify(body) })
      .then((res) => res.json())
      .then(
        (result: { message: string }) => {
          setIsLoaded(true);
          setAlert({ ...result, type: "primary" });
        },
        (error) => {
          setIsLoaded(true);
          setError(error);
        }
      );
  };

  const unsubscribeFromAll = function (event: FormEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (data) {
      const newData = {
        ...data,
        lists: data.lists.map(function (list) {
          return { ...list, isSubscribed: false };
        }),
      };
      postData(newData, account);
      setData(newData);
    }
  };

  const setEmail = function (event: ChangeEvent<HTMLInputElement>) {
    if (data && !saved) {
      setData({
        ...data,
        email: event.target.value,
      });
    }
  };

  const setFirstName = function (event: ChangeEvent<HTMLInputElement>) {
    if (data) {
      setData({
        ...data,
        firstName: event.target.value,
      });
    }
  };

  const setLastName = function (event: ChangeEvent<HTMLInputElement>) {
    if (data) {
      setData({
        ...data,
        lastName: event.target.value,
      });
    }
  };

  const bindSetListSubscription = function (listId: string) {
    return function (event: ChangeEvent<HTMLInputElement>) {
      if (data) {
        let lists = data.lists;
        const listIndex = lists.findIndex((list) => list.id === listId);
        lists[listIndex].isSubscribed = event.target.checked;
        setData({
          ...data,
          lists,
        });
      }
    };
  };

  if (error) {
    console.warn(error);
    return (
      <Flex
        sx={{ justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <Text sx={{ textAlign: "center" }}>Error</Text>
      </Flex>
    );
  } else if (!isLoaded || !data) {
    return (
      <Flex
        sx={{ justifyContent: "center", alignItems: "center", height: "100vh" }}
      >
        <Spinner sx={{ flex: "1 1 auto" }} />
      </Flex>
    );
  }

  const alertBox = alert && (
    <Alert mb={4} padding={3} variant={alert.type}>
      {alert.message}
    </Alert>
  );

  const filteredLists = data.lists.filter(function (list) {
    return !list.name.startsWith("[SPECIAL]") || list.isSubscribed;
  });

  const lists = filteredLists.map(function (list, index) {
    return (
      <Box key={`list-${index}`}>
        <Label mb={2}>
          <Checkbox
            checked={list.isSubscribed}
            onChange={bindSetListSubscription(list.id)}
          />
          {list.name.replace(/\[.*\] /, "")}
        </Label>
      </Box>
    );
  });

  return (
    <Box as="form" onSubmit={onSubmit}>
      {alertBox}
      <Label htmlFor="email" mb={1}>
        Email address
      </Label>
      <Input
        disabled={saved}
        id="email"
        name="email"
        onChange={setEmail}
        type="email"
        value={data.email}
        mb={3}
      />

      <Label htmlFor="firstName" mb={1}>
        First name
      </Label>
      <Input
        id="firstName"
        name="firstName"
        onChange={setFirstName}
        value={data.firstName}
        mb={3}
      />

      <Label htmlFor="lastName" mb={1}>
        Last name
      </Label>
      <Input
        id="lastName"
        name="lastName"
        onChange={setLastName}
        value={data.lastName}
        mb={3}
      />

      <Box mt={3}>{lists}</Box>

      <Button mr={3} mt={3}>
        Save preferences
      </Button>

      <Button onClick={unsubscribeFromAll} variant="secondary">
        Unsubscribe from all
      </Button>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Container>
        <Form />
      </Container>
    </ThemeProvider>
  );
}

export default App;
