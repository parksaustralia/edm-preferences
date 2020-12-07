import React, {
  useEffect,
  useState,
  useMemo,
  ChangeEvent,
  FormEvent,
} from "react";
import queryString from "query-string";
import Loader from "react-loader-spinner";

const apiUrl = "https://l91q1bdnwe.execute-api.ap-southeast-2.amazonaws.com/";

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

type PostBody = {
  contactId?: String;
  email: String;
  firstName?: String;
  lastName?: String;
  listIds: String[];
};

type Alert = {
  message: String;
  type: "success" | "secondary";
};

function Form() {
  const [alert, setAlert] = useState<Alert | null>(null);
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

  useEffect(() => {
    fetch(`${apiUrl}data.json?email=${email}`)
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
  }, [email, listIds, autoSave]);

  // Submit data if coming from another sign up form
  useEffect(() => {
    if (data && !saved && autoSave) {
      postData(data);
    }
  }, [autoSave, data, saved]);

  const onSubmit = function (event: FormEvent<HTMLFormElement>) {
    if (!data) {
      return;
    }

    event.preventDefault();

    postData(data);
  };

  const postData = function (newData: Response) {
    setIsLoaded(false);

    let body: PostBody = {
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
          setAlert({ ...result, type: "success" });
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
      postData(newData);
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
    return (
      <div
        style={{
          width: "100%",
          minHeight: "400px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Error
      </div>
    );
  } else if (!isLoaded || !data) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "400px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Loader type="ThreeDots" color="#007bff" height={100} width={100} />
      </div>
    );
  }

  const alertBox = alert && (
    <div className={`alert alert-${alert.type}`} role="alert">
      {alert.message}
    </div>
  );

  const filteredLists = data.lists.filter(function (list) {
    return !list.name.startsWith("[SPECIAL]") || list.isSubscribed;
  });

  const lists = filteredLists.map(function (list, index) {
    const name = `list-${index}`;
    return (
      <div className="form-check" key={name}>
        <label className="form-check-label">
          <input
            className="form-check-input"
            type="checkbox"
            checked={list.isSubscribed}
            onChange={bindSetListSubscription(list.id)}
          />
          {list.name.replace(/\[.*\] /, "")}
        </label>
      </div>
    );
  });

  return (
    <form onSubmit={onSubmit}>
      {alertBox}
      <div className="form-group">
        <label htmlFor="email">Email address</label>
        <input
          className="form-control"
          disabled={saved}
          id="email"
          name="email"
          onChange={setEmail}
          type="email"
          value={data.email}
        />
      </div>
      <div className="form-group">
        <label htmlFor="firstName">First name</label>
        <input
          className="form-control"
          id="firstName"
          name="firstName"
          onChange={setFirstName}
          value={data.firstName}
        />
      </div>
      <div className="form-group">
        <label htmlFor="lastName">Last name</label>
        <input
          className="form-control"
          id="lastName"
          name="lastName"
          onChange={setLastName}
          value={data.lastName}
        />
      </div>
      {lists}
      <br />
      <button type="submit" className="btn btn-primary btn-lg btn-block">
        Save preferences
      </button>
      <button
        className="btn btn-secondary btn-block"
        onClick={unsubscribeFromAll}
      >
        Unsubscribe from all
      </button>
    </form>
  );
}

function App() {
  return (
    <div className="container">
      <Form />
    </div>
  );
}

export default App;
