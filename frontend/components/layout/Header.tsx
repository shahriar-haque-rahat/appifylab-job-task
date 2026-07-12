"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";
import { useLogoutMutation } from "@/store/api/authApi";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import {
  SearchIcon,
  HomeIcon,
  FriendRequestIcon,
  BellIcon,
  ChatIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  GearIcon,
  HelpIcon,
  LogoutIcon,
} from "@/components/icons";
import { fullName } from "@/lib/format";

// Seeded, static notifications so the dropdown reflects the design instead of an
// empty state. Not a real notification system (out of scope) — realistic sample
// data matching the design's notification card. Uses demo-account names/avatars.
const DUMMY_NOTIFICATIONS: {
  id: string;
  name: string;
  action: string;
  avatar: string;
  time: string;
  unread: boolean;
}[] = [
  {
    id: "n1",
    name: "Radovan Novak",
    action: "liked your post.",
    avatar: "/images/people1.png",
    time: "5 minutes ago",
    unread: true,
  },
  {
    id: "n2",
    name: "Ayesha Khan",
    action: "commented on your post: “This looks great!”",
    avatar: "/images/people2.png",
    time: "22 minutes ago",
    unread: true,
  },
  {
    id: "n3",
    name: "Marcus Lee",
    action: "replied to your comment.",
    avatar: "/images/people3.png",
    time: "1 hour ago",
    unread: true,
  },
  {
    id: "n4",
    name: "Dylan Field",
    action: "liked your post.",
    avatar: "/images/card_ppl1.png",
    time: "3 hours ago",
    unread: false,
  },
  {
    id: "n5",
    name: "Karim Saif",
    action: "started following you.",
    avatar: "/images/card_ppl2.png",
    time: "Yesterday",
    unread: false,
  },
];

const UNREAD_COUNT = DUMMY_NOTIFICATIONS.filter((n) => n.unread).length;

// Converted from the feed.html header: logo + search + icon nav (home, friend
// requests, notifications w/ dropdown, messages) + profile menu. Secondary nav
// links are decorative per the brief ("focus on the feed functionality"); the
// profile menu owns the real Log Out action.
export function Header() {
  const user = useAppSelector(selectAuthUser);
  const [logout, { isLoading }] = useLogoutMutation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function onLogout() {
    setOpen(false);
    try {
      await logout().unwrap();
    } catch {
      /* even if it fails server-side, drop the client session */
    }
    router.replace("/login");
  }

  const name = user ? fullName(user) : "Guest";

  return (
    <nav className="navbar navbar-expand-lg navbar-light _header_nav _padd_t10">
      <div className="container _custom_container">
        <div className="_logo_wrap">
          <Link className="navbar-brand" href="/feed">
            <img src="/images/logo.svg" alt="Buddy Script" className="_nav_logo" />
          </Link>
        </div>

        <div className="_header_form ms-auto">
          <form className="_header_form_grp" onSubmit={(e) => e.preventDefault()}>
            <SearchIcon className="_header_form_svg" />
            <input
              className="form-control me-2 _inpt1"
              type="search"
              placeholder="input search text"
              aria-label="Search"
            />
          </form>
        </div>

        <ul className="navbar-nav mb-2 mb-lg-0 _header_nav_list ms-auto _mar_r8">
          <li className="nav-item _header_nav_item">
            <Link
              className="nav-link _header_nav_link_active _header_nav_link"
              href="/feed"
              aria-current="page"
            >
              <HomeIcon />
            </Link>
          </li>

          <li className="nav-item _header_nav_item">
            <Link
              className="nav-link _header_nav_link"
              href="/feed"
              aria-label="Friend requests"
            >
              <FriendRequestIcon />
            </Link>
          </li>

          <li className="nav-item _header_nav_item">
            <Dropdown
              wrapperClassName="_header_notify_btn"
              panelClassName="_notification_dropdown"
              trigger={({ toggle }) => (
                <button
                  type="button"
                  className="nav-link _header_nav_link _notify_trigger relative border-0 bg-transparent"
                  onClick={toggle}
                  aria-label={`Notifications${
                    UNREAD_COUNT ? `, ${UNREAD_COUNT} unread` : ""
                  }`}
                >
                  <BellIcon />
                  {UNREAD_COUNT > 0 ? (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
                      {UNREAD_COUNT}
                    </span>
                  ) : null}
                </button>
              )}
            >
              {() => (
                <>
                  <div className="_notifications_content">
                    <h4 className="_notifications_content_title">Notifications</h4>
                  </div>
                  <div className="_notifications_drop_box">
                    <div className="_notifications_drop_btn_grp mb-1 flex gap-2.5">
                      <button type="button" className="_notifications_btn_link">
                        All
                      </button>
                      <button type="button" className="_notifications_btn_link1">
                        Unread
                      </button>
                    </div>
                    <div className="_notifications_all">
                      {DUMMY_NOTIFICATIONS.map((n) => (
                        <div
                          key={n.id}
                          className={`_notification_box${
                            n.unread ? " bg-active-surface/60" : ""
                          }`}
                        >
                          <div className="_notification_image">
                            <img src={n.avatar} alt="" className="_notify_img" />
                          </div>
                          <div className="_notification_txt">
                            <p className="_notification_para">
                              <span className="_notify_txt_link">{n.name}</span>{" "}
                              {n.action}
                            </p>
                            <div className="_nitification_time">
                              <span>{n.time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Dropdown>
          </li>

          <li className="nav-item _header_nav_item">
            <Link
              className="nav-link _header_nav_link"
              href="/feed"
              aria-label="Messages"
            >
              <ChatIcon />
            </Link>
          </li>
        </ul>

        <div className="_header_nav_profile relative" ref={profileRef}>
          <div className="_header_nav_profile_image">
            <Avatar
              src={user?.avatarUrl}
              alt={name}
              className="_nav_profile_img"
            />
          </div>
          <div
            className="_header_nav_dropdown cursor-pointer"
            onClick={() => setOpen((o) => !o)}
          >
            <p className="_header_nav_para">{name}</p>
            <button
              type="button"
              className="_header_nav_dropdown_btn _dropdown_toggle"
              aria-label="Account menu"
              aria-expanded={open}
            >
              <ChevronDownIcon />
            </button>
          </div>

          <div className={`_nav_profile_dropdown _profile_dropdown${open ? " show" : ""}`}>
            <div className="_nav_profile_dropdown_info">
              <div className="_nav_profile_dropdown_image">
                <Avatar src={user?.avatarUrl} alt={name} className="_nav_drop_img" />
              </div>
              <div className="_nav_profile_dropdown_info_txt">
                <h4 className="_nav_dropdown_title">{name}</h4>
                <span className="_nav_drop_profile">{user?.email}</span>
              </div>
            </div>
            <hr />
            <ul className="_nav_dropdown_list">
              <li className="_nav_dropdown_list_item">
                <button
                  type="button"
                  className="_nav_dropdown_link w-full cursor-pointer border-0 bg-transparent text-left"
                  onClick={() => setOpen(false)}
                  title="Settings is out of scope for this task"
                >
                  <div className="_nav_drop_info">
                    <span>
                      <GearIcon />
                    </span>{" "}
                    Settings
                  </div>
                  <span className="_nav_drop_btn_link">
                    <ChevronRightIcon />
                  </span>
                </button>
              </li>
              <li className="_nav_dropdown_list_item">
                <button
                  type="button"
                  className="_nav_dropdown_link w-full cursor-pointer border-0 bg-transparent text-left"
                  onClick={() => setOpen(false)}
                  title="Help & Support is out of scope for this task"
                >
                  <div className="_nav_drop_info">
                    <span>
                      <HelpIcon />
                    </span>{" "}
                    Help &amp; Support
                  </div>
                  <span className="_nav_drop_btn_link">
                    <ChevronRightIcon />
                  </span>
                </button>
              </li>
              <li className="_nav_dropdown_list_item">
                <button
                  type="button"
                  className="_nav_dropdown_link w-full cursor-pointer border-0 bg-transparent text-left"
                  onClick={onLogout}
                  disabled={isLoading}
                >
                  <div className="_nav_drop_info">
                    <span>
                      <LogoutIcon />
                    </span>{" "}
                    {isLoading ? "Logging out…" : "Log Out"}
                  </div>
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
